from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import database
from app.database import get_db
from app.deps import get_current_garage
from app.models import CarImage, CarLead, CarListing, GarageProfile
from app.schemas import CarCreate, CarListResponse, CarOut, CarUpdate
from app.storage import delete_file, save_upload

router = APIRouter(prefix="/cars", tags=["cars"])

MAX_IMAGES_PER_CAR = 8


def _ci_contains(col, value: str):
    """Case- and (when available) accent-insensitive 'contains' match."""
    pattern = f"%{value}%"
    if database.HAS_UNACCENT:
        return func.unaccent(col).ilike(func.unaccent(pattern))
    return col.ilike(pattern)


def _load_car(db: Session, car_id: int) -> CarListing:
    car = (
        db.query(CarListing)
        .options(joinedload(CarListing.images), joinedload(CarListing.garage))
        .filter(CarListing.id == car_id)
        .first()
    )
    if car is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    return car


# ---------- Public browsing ----------
@router.get("", response_model=CarListResponse)
def list_cars(
    db: Session = Depends(get_db),
    brand: str | None = None,
    city: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    min_year: int | None = None,
    search: str | None = Query(default=None, description="Free text on brand/model"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=200),
):
    """Public listing: only cars from approved, enabled garages that are active."""
    query = (
        db.query(CarListing)
        .join(GarageProfile, CarListing.garage_id == GarageProfile.id)
        .filter(
            CarListing.is_active.is_(True),
            GarageProfile.is_approved.is_(True),
            GarageProfile.is_disabled.is_(False),
        )
    )

    if brand:
        query = query.filter(_ci_contains(CarListing.brand, brand))
    if city:
        query = query.filter(_ci_contains(GarageProfile.city, city))
    if min_price is not None:
        query = query.filter(CarListing.price >= min_price)
    if max_price is not None:
        query = query.filter(CarListing.price <= max_price)
    if min_year is not None:
        query = query.filter(CarListing.year >= min_year)
    if search:
        query = query.filter(
            _ci_contains(CarListing.brand, search)
            | _ci_contains(CarListing.model, search)
            | _ci_contains(GarageProfile.city, search)
            | _ci_contains(GarageProfile.name, search)
        )

    total = query.with_entities(func.count(CarListing.id)).scalar() or 0
    items = (
        query.options(joinedload(CarListing.images), joinedload(CarListing.garage))
        .order_by(CarListing.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return CarListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/mine", response_model=list[CarOut])
def my_cars(
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    """All listings owned by the current garage (any status)."""
    return (
        db.query(CarListing)
        .options(joinedload(CarListing.images), joinedload(CarListing.garage))
        .filter(CarListing.garage_id == garage.id)
        .order_by(CarListing.created_at.desc())
        .all()
    )


@router.get("/{car_id}", response_model=CarOut)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = _load_car(db, car_id)
    # Hide cars whose garage is not publicly visible.
    if not car.is_active or not car.garage.is_approved or car.garage.is_disabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    car.views += 1
    db.commit()
    db.refresh(car)
    return car


@router.post("/{car_id}/lead", status_code=status.HTTP_204_NO_CONTENT)
def record_lead(car_id: int, db: Session = Depends(get_db)):
    """Record a WhatsApp contact click (the core conversion event). Public, no auth."""
    car = (
        db.query(CarListing)
        .join(GarageProfile, CarListing.garage_id == GarageProfile.id)
        .filter(
            CarListing.id == car_id,
            CarListing.is_active.is_(True),
            GarageProfile.is_approved.is_(True),
            GarageProfile.is_disabled.is_(False),
        )
        .first()
    )
    if car is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    db.add(CarLead(car_id=car.id))
    db.commit()


# ---------- Garage-owned CRUD ----------
@router.post("", response_model=CarOut, status_code=status.HTTP_201_CREATED)
def create_car(
    payload: CarCreate,
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    car = CarListing(garage_id=garage.id, **payload.model_dump())
    db.add(car)
    db.commit()
    db.refresh(car)
    return _load_car(db, car.id)


@router.put("/{car_id}", response_model=CarOut)
def update_car(
    car_id: int,
    payload: CarUpdate,
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    car = _load_car(db, car_id)
    if car.garage_id != garage.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(car, field, value)
    db.commit()
    return _load_car(db, car.id)


@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(
    car_id: int,
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    car = _load_car(db, car_id)
    if car.garage_id != garage.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")

    for image in car.images:
        delete_file(image.path)
    db.delete(car)
    db.commit()


# ---------- Images ----------
@router.post("/{car_id}/images", response_model=CarOut, status_code=status.HTTP_201_CREATED)
def upload_images(
    car_id: int,
    files: list[UploadFile] = File(...),
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    car = _load_car(db, car_id)
    if car.garage_id != garage.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")
    if len(car.images) + len(files) > MAX_IMAGES_PER_CAR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A listing can have at most {MAX_IMAGES_PER_CAR} images",
        )

    for file in files:
        path = save_upload(file)
        db.add(CarImage(car_id=car.id, path=path))
    db.commit()
    return _load_car(db, car.id)


@router.delete("/{car_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    car_id: int,
    image_id: int,
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    car = _load_car(db, car_id)
    if car.garage_id != garage.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your listing")

    image = db.get(CarImage, image_id)
    if image is None or image.car_id != car.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    delete_file(image.path)
    db.delete(image)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_admin
from app.models import AdminActionLog, CarListing, GarageProfile, User
from app.schemas import CarOut, GarageOut
from app.storage import delete_file

router = APIRouter(prefix="/admin", tags=["admin"])


def _log(db: Session, admin: User, action: str, target: str) -> None:
    db.add(AdminActionLog(admin_id=admin.id, action=action, target=target))


@router.get("/garages", response_model=list[GarageOut])
def list_garages(
    approved: bool | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all garages, optionally filtered by approval status (e.g. ?approved=false)."""
    query = db.query(GarageProfile)
    if approved is not None:
        query = query.filter(GarageProfile.is_approved.is_(approved))
    return query.order_by(GarageProfile.created_at.desc()).all()


@router.post("/approve-garage", response_model=GarageOut)
def approve_garage(
    garage_id: int,
    approve: bool = True,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Approve (or reject/unapprove with ?approve=false) a garage."""
    garage = db.get(GarageProfile, garage_id)
    if garage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garage not found")

    garage.is_approved = approve
    _log(db, admin, "approve_garage" if approve else "reject_garage", f"garage:{garage_id}")
    db.commit()
    db.refresh(garage)
    return garage


@router.post("/disable-garage", response_model=GarageOut)
def disable_garage(
    garage_id: int,
    disable: bool = True,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Disable (or re-enable with ?disable=false) a garage and hide its listings."""
    garage = db.get(GarageProfile, garage_id)
    if garage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garage not found")

    garage.is_disabled = disable
    _log(db, admin, "disable_garage" if disable else "enable_garage", f"garage:{garage_id}")
    db.commit()
    db.refresh(garage)
    return garage


@router.get("/cars", response_model=list[CarOut])
def list_all_cars(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(CarListing)
        .options(joinedload(CarListing.images), joinedload(CarListing.garage))
        .order_by(CarListing.created_at.desc())
        .all()
    )


@router.delete("/car/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(
    car_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    car = db.get(CarListing, car_id)
    if car is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")

    for image in car.images:
        delete_file(image.path)
    db.delete(car)
    _log(db, admin, "delete_car", f"car:{car_id}")
    db.commit()

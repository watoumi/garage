from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_garage, get_current_user
from app.models import CarLead, CarListing, GarageProfile, User, UserRole
from app.schemas import (
    CarStat,
    GarageAnalytics,
    GarageCreate,
    GarageOut,
    GarageUpdate,
    LeadOut,
)
from app.storage import delete_file, save_upload

router = APIRouter(prefix="/garage", tags=["garage"])


@router.post("/create", response_model=GarageOut, status_code=status.HTTP_201_CREATED)
def create_garage(
    payload: GarageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a garage profile for the current user (if they registered without one)."""
    if user.role != UserRole.garage:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Garage account required")
    if user.garage is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Garage profile already exists")

    garage = GarageProfile(
        user_id=user.id, is_approved=settings.auto_approve_garages, **payload.model_dump()
    )
    db.add(garage)
    db.commit()
    db.refresh(garage)
    return garage


@router.get("/me", response_model=GarageOut)
def my_garage(garage: GarageProfile = Depends(get_current_garage)):
    return garage


@router.put("/update", response_model=GarageOut)
def update_garage(
    payload: GarageUpdate,
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(garage, field, value)
    db.commit()
    db.refresh(garage)
    return garage


@router.post("/logo", response_model=GarageOut)
def upload_logo(
    file: UploadFile = File(...),
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    """Upload or replace the garage's brand logo (any image; normalised to JPEG)."""
    old_path = garage.logo_path
    garage.logo_path = save_upload(file)
    db.commit()
    db.refresh(garage)
    if old_path:
        delete_file(old_path)
    return garage


def _car_label(car: CarListing) -> str:
    return f"{car.brand} {car.model} · {car.year}"


@router.get("/analytics", response_model=GarageAnalytics)
def analytics(
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
):
    """Aggregate views & WhatsApp leads for the current garage's inventory."""
    cars = db.query(CarListing).filter(CarListing.garage_id == garage.id).all()
    car_ids = [c.id for c in cars]
    week_ago = datetime.now(UTC) - timedelta(days=7)

    leads_per_car: dict[int, int] = {}
    total_leads = leads_last_7d = 0
    if car_ids:
        rows = (
            db.query(CarLead.car_id, func.count(CarLead.id))
            .filter(CarLead.car_id.in_(car_ids))
            .group_by(CarLead.car_id)
            .all()
        )
        leads_per_car = {cid: n for cid, n in rows}
        total_leads = sum(leads_per_car.values())
        leads_last_7d = (
            db.query(func.count(CarLead.id))
            .filter(CarLead.car_id.in_(car_ids), CarLead.created_at >= week_ago)
            .scalar()
            or 0
        )

    per_car = [
        CarStat(
            car_id=c.id,
            label=_car_label(c),
            views=c.views,
            leads=leads_per_car.get(c.id, 0),
        )
        for c in sorted(cars, key=lambda c: (leads_per_car.get(c.id, 0), c.views), reverse=True)
    ]

    return GarageAnalytics(
        total_listings=len(cars),
        active_listings=sum(1 for c in cars if c.is_active),
        total_views=sum(c.views for c in cars),
        total_leads=total_leads,
        leads_last_7d=leads_last_7d,
        per_car=per_car,
    )


@router.get("/leads", response_model=list[LeadOut])
def leads(
    garage: GarageProfile = Depends(get_current_garage),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Recent WhatsApp leads across the garage's listings, newest first."""
    rows = (
        db.query(CarLead, CarListing)
        .join(CarListing, CarLead.car_id == CarListing.id)
        .filter(CarListing.garage_id == garage.id)
        .order_by(CarLead.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        LeadOut(
            id=lead.id,
            car_id=car.id,
            car_label=_car_label(car),
            created_at=lead.created_at,
        )
        for lead, car in rows
    ]

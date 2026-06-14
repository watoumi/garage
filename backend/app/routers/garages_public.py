from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import CarImage, CarListing, GarageProfile
from app.schemas import CarOut, GarageCard, GaragePublic, GarageProfilePublic, NearbyGarage


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in km between two lat/lng points."""
    r = 6371.0
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * r * asin(sqrt(a))


def _garage_covers(db: Session, garage_ids: list[int]) -> dict[int, str]:
    """One representative photo per garage (newest active car's first image)."""
    if not garage_ids:
        return {}
    rows = (
        db.query(CarListing.garage_id, CarImage)
        .join(CarImage, CarImage.car_id == CarListing.id)
        .filter(CarListing.garage_id.in_(garage_ids), CarListing.is_active.is_(True))
        .order_by(CarListing.garage_id, CarListing.created_at.desc(), CarImage.id.asc())
        .all()
    )
    covers: dict[int, str] = {}
    for gid, img in rows:
        if gid not in covers:
            covers[gid] = img.url
    return covers

# Public, read-only garage profiles (plural prefix to avoid the auth'd /garage routes).
router = APIRouter(prefix="/garages", tags=["garages-public"])


@router.get("", response_model=list[GarageCard])
def list_garages(db: Session = Depends(get_db), limit: int = Query(default=12, ge=1, le=200)):
    """Directory of verified (approved, enabled) garages with their active car counts."""
    count_col = func.count(CarListing.id).filter(CarListing.is_active.is_(True)).label("car_count")
    rows = (
        db.query(GarageProfile, count_col)
        .outerjoin(CarListing, CarListing.garage_id == GarageProfile.id)
        .filter(GarageProfile.is_approved.is_(True), GarageProfile.is_disabled.is_(False))
        .group_by(GarageProfile.id)
        .order_by(count_col.desc())
        .limit(limit)
        .all()
    )
    cards = [
        GarageCard(**GaragePublic.model_validate(g).model_dump(), car_count=count)
        for g, count in rows
    ]
    covers = _garage_covers(db, [c.id for c in cards])
    for c in cards:
        c.cover_url = covers.get(c.id)
    return cards


@router.get("/nearby", response_model=list[NearbyGarage])
def nearby_garages(
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius: float = Query(default=10, ge=1, le=200),  # km
    db: Session = Depends(get_db),
):
    """Verified garages within `radius` km of (lat, lng), sorted by distance ASC.

    A bounding box prefilters in SQL (so we never scan all garages globally),
    then exact Haversine distance is computed and filtered/sorted in Python.
    """
    # Bounding box around the user (~111 km per degree of latitude).
    lat_delta = radius / 111.0
    cos_lat = cos(radians(lat))
    lng_delta = radius / (111.0 * cos_lat) if abs(cos_lat) > 1e-6 else 180.0

    count_col = func.count(CarListing.id).filter(CarListing.is_active.is_(True)).label("car_count")
    rows = (
        db.query(GarageProfile, count_col)
        .outerjoin(CarListing, CarListing.garage_id == GarageProfile.id)
        .filter(
            GarageProfile.is_approved.is_(True),
            GarageProfile.is_disabled.is_(False),
            GarageProfile.latitude.isnot(None),
            GarageProfile.longitude.isnot(None),
            GarageProfile.latitude.between(lat - lat_delta, lat + lat_delta),
            GarageProfile.longitude.between(lng - lng_delta, lng + lng_delta),
        )
        .group_by(GarageProfile.id)
        .all()
    )

    out: list[NearbyGarage] = []
    for g, count in rows:
        dist = _haversine_km(lat, lng, g.latitude, g.longitude)
        if dist <= radius:
            out.append(
                NearbyGarage(
                    **GaragePublic.model_validate(g).model_dump(),
                    car_count=count,
                    distance_km=round(dist, 2),
                )
            )
    covers = _garage_covers(db, [g.id for g in out])
    for g in out:
        g.cover_url = covers.get(g.id)
    out.sort(key=lambda x: x.distance_km)
    return out


@router.get("/{garage_id}", response_model=GarageProfilePublic)
def public_garage(garage_id: int, db: Session = Depends(get_db)):
    """A garage's public profile plus all of its active listings."""
    garage = db.get(GarageProfile, garage_id)
    if garage is None or not garage.is_approved or garage.is_disabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Garage not found")

    cars = (
        db.query(CarListing)
        .options(joinedload(CarListing.images), joinedload(CarListing.garage))
        .filter(CarListing.garage_id == garage.id, CarListing.is_active.is_(True))
        .order_by(CarListing.created_at.desc())
        .all()
    )

    base = GaragePublic.model_validate(garage)
    return GarageProfilePublic(
        **base.model_dump(),
        cars=[CarOut.model_validate(c) for c in cars],
    )

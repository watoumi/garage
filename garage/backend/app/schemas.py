from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import FuelType, Transmission, UserRole


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    # Garage details supplied at registration (one-step onboarding).
    name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=6, max_length=40)
    city: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=2, max_length=255)
    description: str | None = None
    # Exact geocoded coordinates (source of truth for the map).
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole


# ---------- Garage ----------
class GarageBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=6, max_length=40)
    city: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=2, max_length=255)
    description: str | None = None


class GarageCreate(GarageBase):
    pass


class GarageUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, min_length=6, max_length=40)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class GarageOut(GarageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    logo_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_approved: bool
    is_disabled: bool
    created_at: datetime


# Public garage info shown on listings (no private email/internal fields).
class GaragePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    city: str
    address: str
    description: str | None = None
    logo_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None


# ---------- Cars ----------
class CarBase(BaseModel):
    brand: str = Field(min_length=1, max_length=120)
    model: str = Field(min_length=1, max_length=120)
    year: int = Field(ge=1950, le=2100)
    mileage: int = Field(ge=0)
    fuel_type: FuelType
    transmission: Transmission
    price: float = Field(ge=0)
    description: str | None = None


class CarCreate(CarBase):
    pass


class CarUpdate(BaseModel):
    brand: str | None = Field(default=None, min_length=1, max_length=120)
    model: str | None = Field(default=None, min_length=1, max_length=120)
    year: int | None = Field(default=None, ge=1950, le=2100)
    mileage: int | None = Field(default=None, ge=0)
    fuel_type: FuelType | None = None
    transmission: Transmission | None = None
    price: float | None = Field(default=None, ge=0)
    description: str | None = None
    is_active: bool | None = None


class CarImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str


class CarOut(CarBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    views: int = 0
    created_at: datetime
    images: list[CarImageOut] = []
    garage: GaragePublic


class CarListResponse(BaseModel):
    items: list[CarOut]
    total: int
    page: int
    page_size: int


# Public garage profile page: garage info + all of its active listings.
class GarageProfilePublic(GaragePublic):
    cars: list[CarOut] = []


# Verified garages directory (homepage row).
class GarageCard(GaragePublic):
    car_count: int = 0
    cover_url: str | None = None  # top car's photo, for the list/map cards


# A garage with its distance from the user (Nearby Finder).
class NearbyGarage(GarageCard):
    distance_km: float


# ---------- Dashboard analytics & leads ----------
class CarStat(BaseModel):
    car_id: int
    label: str  # "Brand Model · Year"
    views: int
    leads: int


class GarageAnalytics(BaseModel):
    total_listings: int
    active_listings: int
    total_views: int
    total_leads: int
    leads_last_7d: int
    per_car: list[CarStat]


class LeadOut(BaseModel):
    id: int
    car_id: int
    car_label: str
    created_at: datetime

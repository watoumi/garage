import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    admin = "admin"
    garage = "garage"


class FuelType(str, enum.Enum):
    petrol = "petrol"
    diesel = "diesel"
    hybrid = "hybrid"
    electric = "electric"
    lpg = "lpg"


class Transmission(str, enum.Enum):
    manual = "manual"
    automatic = "automatic"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.garage, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    garage: Mapped["GarageProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class GarageProfile(Base):
    __tablename__ = "garage_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)  # WhatsApp number, e.g. 2126XXXXXXXX
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Optional brand logo (relative path, e.g. "uploads/abc.jpg").
    logo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Geolocation for the map experience.
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Garages must be approved by an admin before their listings go public.
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="garage")
    cars: Mapped[list["CarListing"]] = relationship(
        back_populates="garage", cascade="all, delete-orphan"
    )

    @property
    def logo_url(self) -> str | None:
        """Absolute URL of the logo, or None (config imported lazily)."""
        if not self.logo_path:
            return None
        from app.config import settings

        return f"{settings.public_base_url.rstrip('/')}/{self.logo_path.lstrip('/')}"


class CarListing(Base):
    __tablename__ = "car_listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    garage_id: Mapped[int] = mapped_column(ForeignKey("garage_profiles.id", ondelete="CASCADE"), index=True)

    brand: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    mileage: Mapped[int] = mapped_column(Integer, nullable=False)  # km
    fuel_type: Mapped[FuelType] = mapped_column(Enum(FuelType), nullable=False)
    transmission: Mapped[Transmission] = mapped_column(Enum(Transmission), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False, index=True)  # MAD
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # detail page views
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    garage: Mapped["GarageProfile"] = relationship(back_populates="cars")
    images: Mapped[list["CarImage"]] = relationship(
        back_populates="car", cascade="all, delete-orphan", order_by="CarImage.id"
    )
    leads: Mapped[list["CarLead"]] = relationship(
        back_populates="car", cascade="all, delete-orphan"
    )


class CarImage(Base):
    __tablename__ = "car_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("car_listings.id", ondelete="CASCADE"), index=True)
    # Stored relative path, e.g. "uploads/abc123.jpg"; served as a static file.
    path: Mapped[str] = mapped_column(String(500), nullable=False)

    car: Mapped["CarListing"] = relationship(back_populates="images")

    @property
    def url(self) -> str:
        """Absolute URL used by API responses (config imported lazily to avoid cycles)."""
        from app.config import settings

        return f"{settings.public_base_url.rstrip('/')}/{self.path.lstrip('/')}"


class CarLead(Base):
    """A buyer's WhatsApp contact click — the platform's core conversion event."""

    __tablename__ = "car_leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("car_listings.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    car: Mapped["CarListing"] = relationship(back_populates="leads")


class AdminActionLog(Base):
    __tablename__ = "admin_action_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. "approve_garage"
    target: Mapped[str | None] = mapped_column(String(120), nullable=True)  # e.g. "garage:5"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

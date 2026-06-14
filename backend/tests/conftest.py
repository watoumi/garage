"""Shared test fixtures.

Every test runs against a throwaway SQLite database that is rebuilt from
scratch before each test, so tests are isolated and order-independent. The
environment is configured *before* importing the app so the engine binds to
the test database rather than the real ./garage.db file.
"""
import os
import tempfile

# Configure the app for testing BEFORE it is imported anywhere below.
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ENVIRONMENT"] = "development"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.limiter import limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    CarListing,
    FuelType,
    GarageProfile,
    Transmission,
    User,
    UserRole,
)
from app.security import create_access_token, hash_password  # noqa: E402

# Rate limiting would make repeated register/login calls flaky in tests.
limiter.enabled = False


@pytest.fixture(autouse=True)
def _fresh_db():
    """Rebuild all tables before each test for full isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    return TestClient(app)


# ---------- Factory helpers (returned as callables so tests stay terse) ----------
@pytest.fixture
def make_admin(db):
    def _make(email="admin@test.ma", password="password123"):
        user = User(
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.admin,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make


@pytest.fixture
def make_garage(db):
    def _make(
        email,
        *,
        approved=True,
        disabled=False,
        name="Atlas Motors",
        city="Casablanca",
        password="password123",
    ):
        user = User(
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.garage,
        )
        user.garage = GarageProfile(
            name=name,
            phone="212600000000",
            city=city,
            address="123 Boulevard Mohammed V",
            is_approved=approved,
            is_disabled=disabled,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _make


@pytest.fixture
def make_car(db):
    def _make(garage_user, *, brand="Toyota", model="Corolla", is_active=True, price=150000):
        car = CarListing(
            garage_id=garage_user.garage.id,
            brand=brand,
            model=model,
            year=2020,
            mileage=50000,
            fuel_type=FuelType.diesel,
            transmission=Transmission.manual,
            price=price,
            is_active=is_active,
        )
        db.add(car)
        db.commit()
        db.refresh(car)
        return car

    return _make


@pytest.fixture
def auth_header():
    def _header(user):
        token = create_access_token(subject=user.id, role=user.role.value)
        return {"Authorization": f"Bearer {token}"}

    return _header

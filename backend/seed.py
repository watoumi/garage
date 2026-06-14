"""Seed the database with an admin, sample garages and car listings.

Run from the backend/ directory:  python seed.py
Safe to run multiple times (it resets sample data, keeps your real data untouched
only in the sense that it wipes the seeded rows by email — use on a dev DB).
"""

from app.config import settings
from app.database import Base, SessionLocal, engine, ensure_columns
from app.models import (
    CarListing,
    FuelType,
    GarageProfile,
    Transmission,
    User,
    UserRole,
)
from app.security import hash_password

Base.metadata.create_all(bind=engine)
ensure_columns()  # add newer columns before inserting rows that use them


SAMPLE_GARAGES = [
    {
        "email": "atlas@garage.ma",
        "password": "garage123",
        "name": "Atlas Auto Casablanca",
        "phone": "212661112233",
        "city": "Casablanca",
        "address": "12 Bd Zerktouni, Casablanca",
        "description": "Specialists in low-mileage German cars. 15 years in business.",
        "approved": True,
        "lat": 33.5899, "lng": -7.6039,
        "cars": [
            dict(brand="Volkswagen", model="Golf 7", year=2018, mileage=78000,
                 fuel_type=FuelType.diesel, transmission=Transmission.manual, price=165000,
                 description="Golf 7 1.6 TDI, full service history, first owner."),
            dict(brand="Audi", model="A3", year=2019, mileage=62000,
                 fuel_type=FuelType.diesel, transmission=Transmission.automatic, price=235000,
                 description="A3 S-line, automatic S-tronic, excellent condition."),
            dict(brand="BMW", model="Serie 1", year=2017, mileage=95000,
                 fuel_type=FuelType.diesel, transmission=Transmission.automatic, price=198000,
                 description="BMW 118d, pack M, well maintained."),
        ],
    },
    {
        "email": "medina@garage.ma",
        "password": "garage123",
        "name": "Medina Motors Rabat",
        "phone": "212662223344",
        "city": "Rabat",
        "address": "45 Avenue Mohammed V, Rabat",
        "description": "Family-run dealership. Japanese and French city cars.",
        "approved": True,
        "lat": 34.0209, "lng": -6.8416,
        "cars": [
            dict(brand="Dacia", model="Sandero", year=2020, mileage=45000,
                 fuel_type=FuelType.petrol, transmission=Transmission.manual, price=118000,
                 description="Sandero Stepway, like new, city driven only."),
            dict(brand="Renault", model="Clio 5", year=2021, mileage=30000,
                 fuel_type=FuelType.petrol, transmission=Transmission.manual, price=145000,
                 description="Clio 5 Zen, low mileage, warranty remaining."),
            dict(brand="Toyota", model="Yaris", year=2019, mileage=58000,
                 fuel_type=FuelType.hybrid, transmission=Transmission.automatic, price=172000,
                 description="Yaris Hybrid, very economical, perfect for the city."),
        ],
    },
    {
        "email": "souss@garage.ma",
        "password": "garage123",
        "name": "Souss Premium Agadir",
        "phone": "212663334455",
        "city": "Agadir",
        "address": "Zone Industrielle, Agadir",
        "description": "Premium SUVs and 4x4. Pending verification.",
        "approved": False,  # left unapproved to test the admin flow
        "lat": 30.4278, "lng": -9.5981,
        "cars": [
            dict(brand="Hyundai", model="Tucson", year=2020, mileage=70000,
                 fuel_type=FuelType.diesel, transmission=Transmission.automatic, price=310000,
                 description="Tucson Executive, full options, leather seats."),
        ],
    },
    {
        "email": "kasbah@garage.ma",
        "password": "garage123",
        "name": "Kasbah Auto Marrakech",
        "phone": "212664445566",
        "city": "Marrakech",
        "address": "Route de Casablanca, Marrakech",
        "description": "Berlines et SUV premium. Reprise possible.",
        "approved": True,
        "lat": 31.6295, "lng": -7.9811,
        "cars": [
            dict(brand="Peugeot", model="3008", year=2021, mileage=42000,
                 fuel_type=FuelType.diesel, transmission=Transmission.automatic, price=295000,
                 description="3008 GT Line, toit panoramique, état impeccable."),
            dict(brand="Mercedes", model="Classe A", year=2019, mileage=68000,
                 fuel_type=FuelType.diesel, transmission=Transmission.automatic, price=285000,
                 description="Classe A 180d AMG Line, full options."),
            dict(brand="Volkswagen", model="Tiguan", year=2020, mileage=55000,
                 fuel_type=FuelType.diesel, transmission=Transmission.automatic, price=325000,
                 description="Tiguan Carat, première main."),
        ],
    },
    {
        "email": "detroit@garage.ma",
        "password": "garage123",
        "name": "Détroit Motors Tanger",
        "phone": "212665556677",
        "city": "Tanger",
        "address": "Bd Mohammed VI, Tanger",
        "description": "Citadines et compactes économiques.",
        "approved": True,
        "lat": 35.7595, "lng": -5.8340,
        "cars": [
            dict(brand="Renault", model="Mégane", year=2020, mileage=61000,
                 fuel_type=FuelType.diesel, transmission=Transmission.manual, price=158000,
                 description="Mégane 4 Intens, GPS, caméra de recul."),
            dict(brand="Dacia", model="Duster", year=2021, mileage=38000,
                 fuel_type=FuelType.diesel, transmission=Transmission.manual, price=189000,
                 description="Duster Prestige 4x2, comme neuf."),
        ],
    },
]


def reset_seed_data(db):
    """Remove previously seeded users (by email) so re-running stays idempotent."""
    emails = [settings.admin_email] + [g["email"] for g in SAMPLE_GARAGES]
    for user in db.query(User).filter(User.email.in_(emails)).all():
        db.delete(user)  # cascades to garage + cars + images
    db.commit()


def seed_engagement(db):
    """Give approved garages' cars some random views and recent leads."""
    import random
    from datetime import datetime, timedelta, timezone

    from app.models import CarLead, GarageProfile

    cars = (
        db.query(CarListing)
        .join(GarageProfile, CarListing.garage_id == GarageProfile.id)
        .filter(GarageProfile.is_approved.is_(True))
        .all()
    )
    now = datetime.now(timezone.utc)
    for car in cars:
        car.views = random.randint(40, 600)
        for _ in range(random.randint(1, 9)):
            days_ago = random.randint(0, 13)
            db.add(CarLead(car_id=car.id, created_at=now - timedelta(days=days_ago, hours=random.randint(0, 23))))
    db.commit()


def main():
    db = SessionLocal()
    try:
        reset_seed_data(db)

        admin = User(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            role=UserRole.admin,
        )
        db.add(admin)

        for g in SAMPLE_GARAGES:
            user = User(
                email=g["email"],
                hashed_password=hash_password(g["password"]),
                role=UserRole.garage,
            )
            user.garage = GarageProfile(
                name=g["name"], phone=g["phone"], city=g["city"],
                address=g["address"], description=g["description"],
                is_approved=g["approved"], latitude=g["lat"], longitude=g["lng"],
            )
            for car in g["cars"]:
                user.garage.cars.append(CarListing(**car))
            db.add(user)

        db.commit()

        # Populate demo views + WhatsApp leads so dashboards look alive.
        seed_engagement(db)

        print("Seed complete.")
        print(f"  Admin:   {settings.admin_email} / {settings.admin_password}")
        for g in SAMPLE_GARAGES:
            flag = "approved" if g["approved"] else "PENDING approval"
            print(f"  Garage:  {g['email']} / {g['password']}  ({flag})")
    finally:
        db.close()


if __name__ == "__main__":
    main()

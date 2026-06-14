# 🚗 Garage.ma — Verified Dealership Car Marketplace (MVP)

A **garage-first** used-car marketplace for Morocco. Unlike general classifieds
(e.g. Avito), **only verified garages can list cars**. Buyers browse publicly and
contact garages directly on **WhatsApp** — no payments, no chat, no accounts for
buyers. Trust and simplicity are the whole point.

```
Garage registers → Admin approves → Garage uploads cars → Buyer browses → WhatsApp → Deal happens offline
```

## Tech stack

| Layer    | Choice                                            |
|----------|---------------------------------------------------|
| Backend  | FastAPI + SQLAlchemy 2.0 + JWT auth               |
| Database | SQLite by default (one env var switches to Postgres) |
| Frontend | Next.js 14 (App Router) + TypeScript + TailwindCSS |
| Images   | Local disk (`backend/uploads/`), served statically |
| API      | REST                                              |

---

## Project structure

```
garage/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, static /uploads, routers
│   │   ├── config.py        # env-based settings
│   │   ├── database.py      # engine + session + Base
│   │   ├── models.py        # User, GarageProfile, CarListing, CarImage, AdminActionLog
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── security.py      # password hashing + JWT
│   │   ├── deps.py          # auth dependencies (current user / garage / admin)
│   │   ├── storage.py       # image upload validation + saving
│   │   └── routers/         # auth.py, garage.py, cars.py, admin.py
│   ├── seed.py              # sample admin + garages + cars
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/                 # pages (see "Frontend pages" below)
    ├── components/          # Navbar, CarCard
    ├── lib/                 # api client, auth, types, formatting helpers
    └── .env.local.example
```

---

## 0. Run everything with Docker (fastest)

Spins up PostgreSQL + the API + the frontend with one command. Requires Docker.

```bash
docker compose up --build        # or: docker-compose up --build
```

- Frontend: <http://localhost:3000>
- API docs: <http://localhost:8000/docs>
- PostgreSQL: `localhost:5432` (user/pass/db all `garage`)

Sample data (admin + garages + cars) is seeded automatically on first start.
Stop with `docker compose down`, or `docker compose down -v` to also wipe the
database and uploaded images.

> **Notes**
> - `NEXT_PUBLIC_API_URL` is baked into the frontend at build time (see
>   `docker-compose.yml`), so it must be a URL your **browser** can reach
>   (`http://localhost:8000`). Change it there if you deploy elsewhere, then rebuild.
> - The backend seeds on every start via `SEED_ON_START=true`; set it to `false`
>   in `docker-compose.yml` once you have real data.

Prefer running the services directly on your machine? Use the sections below.

## 1. Run the backend

> Requires Python 3.11+. If `python3 -m venv` complains about `ensurepip`,
> either `sudo apt install python3-venv`, or use `virtualenv` as shown below.

```bash
cd backend

# Create an isolated environment (option A: venv)
python3 -m venv .venv && source .venv/bin/activate

# ...or (option B: virtualenv, if venv is unavailable)
# pip install --user virtualenv && python3 -m virtualenv .venv && source .venv/bin/activate

pip install -r requirements.txt

# Configure (defaults work out of the box with SQLite)
cp .env.example .env

# Seed an admin + sample garages and cars
python seed.py

# Start the API
uvicorn app.main:app --reload --port 8000
```

- API: <http://localhost:8000>
- Interactive docs (Swagger): <http://localhost:8000/docs>

### Switching to PostgreSQL

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/garage
```

Then re-run `python seed.py`. (Tables are auto-created on startup; no Alembic needed for the MVP.)

---

## 2. Run the frontend

> Requires Node.js 18+.

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at http://localhost:8000
npm run dev
```

- App: <http://localhost:3000>

---

## 3. Try it out

Seeded accounts (from `seed.py`):

| Role   | Email               | Password   | Notes                          |
|--------|---------------------|------------|--------------------------------|
| Admin  | `admin@garage.ma`   | `admin123` | Approves garages, deletes cars |
| Garage | `atlas@garage.ma`   | `garage123`| Approved (Casablanca)          |
| Garage | `medina@garage.ma`  | `garage123`| Approved (Rabat)               |
| Garage | `souss@garage.ma`   | `garage123`| **Pending** approval (Agadir)  |

Suggested walkthrough:

1. Open <http://localhost:3000> → browse seeded cars, use the filters.
2. Click a car → see details → click **Contacter sur WhatsApp** (opens `wa.me` with a prefilled message).
3. Log in as a garage (`atlas@garage.ma`) → **Mon espace** → **+ Ajouter une voiture** with photos.
4. Register a brand-new garage at `/garage/register` → notice it's *pending* and its cars are hidden publicly.
5. Log in as admin → **Admin** → approve the new garage → its cars now appear on the homepage.

---

## API reference (REST)

Base URL `http://localhost:8000`. Auth via `Authorization: Bearer <token>`.

### Auth
| Method | Path             | Body                                        | Notes                              |
|--------|------------------|---------------------------------------------|------------------------------------|
| POST   | `/auth/register` | email, password, name, phone, city, address | Creates garage user **+ profile**, returns JWT |
| POST   | `/auth/login`    | email, password                             | Returns JWT + role                 |

### Garage (auth: garage)
| Method | Path              | Notes                                   |
|--------|-------------------|-----------------------------------------|
| POST   | `/garage/create`  | Create profile (if registered without one) |
| GET    | `/garage/me`      | Current garage profile + approval status |
| PUT    | `/garage/update`  | Update profile fields                   |

### Cars
| Method | Path                          | Auth    | Notes                                                   |
|--------|-------------------------------|---------|---------------------------------------------------------|
| GET    | `/cars`                       | public  | Filters: `brand, city, min_price, max_price, min_year, search, page, page_size`. Only approved & active. |
| GET    | `/cars/{id}`                  | public  | Hidden if garage unapproved/disabled or car inactive    |
| GET    | `/cars/mine`                  | garage  | All own listings (any status)                           |
| POST   | `/cars`                       | garage  | Create listing (JSON)                                   |
| PUT    | `/cars/{id}`                  | garage  | Update own listing (incl. `is_active` to hide/show)     |
| DELETE | `/cars/{id}`                  | garage  | Delete own listing + its images                         |
| POST   | `/cars/{id}/images`           | garage  | Multipart `files[]` (JPEG/PNG/WebP, ≤5 MB, ≤8 per car)  |
| DELETE | `/cars/{id}/images/{imageId}` | garage  | Remove one image                                        |

### Admin (auth: admin)
| Method | Path                                          | Notes                              |
|--------|-----------------------------------------------|------------------------------------|
| GET    | `/admin/garages?approved=`                    | List garages (filter by approval)  |
| POST   | `/admin/approve-garage?garage_id=&approve=`   | Approve / revoke a garage          |
| POST   | `/admin/disable-garage?garage_id=&disable=`   | Disable / re-enable (hides cars)   |
| GET    | `/admin/cars`                                 | All cars across garages            |
| DELETE | `/admin/car/{id}`                             | Delete any listing                 |

---

## Frontend pages

| Route                | Purpose                                              |
|----------------------|------------------------------------------------------|
| `/`                  | Homepage: car grid + filters (brand, city, price, search) |
| `/car/[id]`          | Car detail, image gallery, WhatsApp contact button   |
| `/garage/register`   | Garage sign-up (one-step account + profile)          |
| `/garage/login`      | Login (garage **and** admin)                         |
| `/garage/dashboard`  | Garage's listings: hide/show, delete, approval banner |
| `/garage/add-car`    | Create a listing + upload photos                     |
| `/admin/dashboard`   | Approve/disable garages, delete listings, stats      |

---

## Data model

- **User** — `email`, `hashed_password`, `role` (`admin` | `garage`), `is_active`
- **GarageProfile** — `name`, `phone` (WhatsApp), `city`, `address`, `description`, `is_approved`, `is_disabled` (1:1 with User)
- **CarListing** — `brand`, `model`, `year`, `mileage`, `fuel_type`, `transmission`, `price`, `description`, `is_active` (belongs to a garage)
- **CarImage** — `path` (served as absolute `url`) (belongs to a car)
- **AdminActionLog** — `admin_id`, `action`, `target` (audit trail of approvals/deletions)

### Trust rules (enforced server-side)
- A car is **publicly visible only if** its garage is approved **and** not disabled **and** the car is active.
- Garages can only edit/delete **their own** listings.
- Newly registered garages start **unapproved** — their inventory stays hidden until an admin approves them.

---

## Production notes (beyond the MVP)
- Set a strong `SECRET_KEY` (`openssl rand -hex 32`) and switch to PostgreSQL.
- Move image storage to S3-compatible object storage (the `storage.py` seam is where you'd swap it).
- Add Alembic migrations instead of `create_all`.
- Put the API behind HTTPS and tighten `CORS_ORIGINS` to your real domain.

<div align="center">

# 🚗 Garage.ma

### The trusted way to buy a used car in Morocco — from **verified dealerships only**.

A garage-first car marketplace where every seller is a vetted dealership, every
listing is moderated, and buyers reach sellers in one tap on WhatsApp. Discover
inventory on an interactive map, find the nearest verified garage, and skip the
scams that plague open classifieds.

[![CI](https://github.com/watoumi/garage/actions/workflows/ci.yml/badge.svg)](https://github.com/watoumi/garage/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/API-FastAPI-009688.svg)](#-tech-stack)
[![Frontend](https://img.shields.io/badge/Web-Next.js%2014-black.svg)](#-tech-stack)
[![Tests](https://img.shields.io/badge/tests-18%20passing-brightgreen.svg)](#-quality--testing)

[Live demo](#) · [Quick start](#-quick-start) · [Architecture](#-architecture) · [API](#-api-reference)

</div>

---

## ⚡ TL;DR

|  |  |
|---|---|
| **What** | A verified-dealership-only used-car marketplace for Morocco. |
| **Who** | Buyers who want trust; garages who want qualified leads. |
| **The bet** | Every seller is admin-approved → no fake listings, no scams. |
| **The model** | Free to browse, no buyer accounts, no payments — deals close on **WhatsApp**. |
| **Status** | Working MVP · full-stack · tested · CI · one-command Docker run. |

> Unlike general classifieds (e.g. Avito), **only verified garages can list cars.**
> Trust isn't a feature — it's the entire product, and it's **enforced server-side and covered by tests.**

```
 Garage signs up  →  Admin verifies  →  Garage lists cars  →  Buyer discovers on map  →  WhatsApp  →  Deal closes
```

---

## ✨ Core Features

### 🗺️ Map-based garage discovery
Browse verified dealerships on an interactive, clustered map. Pan, zoom, and click
a pin to jump straight to that garage's live inventory.
> Built on Leaflet + OpenStreetMap — **no map API key required**, with a clean swap
> point to Google Maps if needed.

### 📍 "Find garages near me"
Geolocated nearby search returns verified garages within a chosen radius, **sorted
by real distance**. The backend prefilters candidates with a SQL bounding box (so it
never scans every garage globally) then computes exact great-circle (Haversine) distance.

### 🏷️ Garage → inventory management
Each verified garage gets a dashboard to publish, edit, hide/show, and delete listings,
with multi-photo uploads (auto-validated & re-compressed), plus a **profile page** that
showcases the dealership and all of its active cars.

### 💬 One-tap WhatsApp contact
No in-app chat, no friction. Buyers tap **"Contact on WhatsApp"** and land in a chat
with the dealer and a pre-filled message — exactly how this market already transacts.
Every tap is recorded as a **lead** so garages can measure demand.

### 🛡️ Admin verification & moderation
A dedicated admin console approves/rejects garages, disables bad actors (instantly
hiding all their cars), and removes listings — every action written to an **audit log**.

### 📈 Seller analytics
Per-garage dashboard: total views, total WhatsApp leads, leads in the last 7 days, and
a per-car breakdown — the conversion signal a real dealership cares about.

---

## 🖼️ Screenshots

<!-- TODO: replace with real captures — commit them under docs/screenshots/ and link here,
     or drag images into a GitHub issue/PR to host them and paste the URLs. -->

| Discovery map + nearby search | Car detail + WhatsApp | Garage dashboard | Admin console |
|---|---|---|---|
| _add screenshot_ | _add screenshot_ | _add screenshot_ | _add screenshot_ |

---

## 🧭 Architecture

A clean three-tier split: a typed Next.js web client, a stateless FastAPI service
enforcing all trust rules, and a relational store — with image and map concerns
isolated behind swap-friendly seams.

```
                          ┌──────────────────────────────────────────────┐
                          │                  BROWSER                       │
                          │        Next.js 14 (App Router) + TS            │
                          │   Buyer UI · Garage dashboard · Admin console  │
                          └───────┬───────────────────────────┬──────────┘
                                  │  REST / JSON (JWT)         │  tiles & geocoding
                                  │                            ▼
                                  │                 ┌────────────────────────┐
                                  │                 │  OpenStreetMap /        │
                                  │                 │  Nominatim (no API key) │
                                  ▼                 └────────────────────────┘
        ┌──────────────────────────────────────────────────────────────┐
        │                      FastAPI  (Python)                          │
        │                                                                 │
        │   Auth (JWT)   Rate limiting   Security headers   CORS allowlist│
        │  ───────────────────────────────────────────────────────────   │
        │   /auth     /garage     /cars     /garages (public)    /admin   │
        │                                                                 │
        │   ▸ TRUST GATE: a car is public only if                         │
        │       garage.approved ∧ ¬garage.disabled ∧ car.active           │
        │   ▸ Ownership checks · role gating · audit log                  │
        └───────┬───────────────────────────────────────┬────────────────┘
                │ SQLAlchemy 2.0 ORM                     │ storage.py seam
                ▼                                        ▼
   ┌─────────────────────────┐              ┌──────────────────────────┐
   │  Database                │              │  Image storage            │
   │  SQLite (dev) /          │              │  Local disk (dev)         │
   │  PostgreSQL (prod)       │              │  → S3-compatible (prod)   │
   └─────────────────────────┘              └──────────────────────────┘

   Buyer → taps "Contact on WhatsApp" → wa.me deep link (prefilled message)
                                       → lead recorded for the garage
```

**Why this shape**

- **All trust logic lives in one place — the API.** The UI never decides visibility;
  the server does, and [tests](backend/tests/test_trust_rules.py) lock the rule down.
- **Stateless API + JWT** → horizontally scalable; no server-side sessions.
- **Storage and maps are seams, not couplings.** Local disk → S3 and OSM → Google Maps
  are each a one-file change.
- **Boots safely:** the API *refuses to start in production* with a default secret or
  wildcard CORS (`assert_production_safe()`), and hides its docs in prod.

---

## 🧱 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS | Typed, modern, SEO-friendly SSR |
| **Maps** | Leaflet + OpenStreetMap, marker clustering, Nominatim geocoding | Rich map UX with zero API-key cost |
| **Backend** | FastAPI, Pydantic v2 | Async, typed, auto-generated OpenAPI docs |
| **ORM / DB** | SQLAlchemy 2.0 · SQLite (dev) → PostgreSQL (prod) | Zero-config locally, production-ready via one env var |
| **Auth** | JWT (python-jose) + bcrypt (passlib) | Stateless sessions, hashed credentials |
| **Hardening** | Rate limiting (SlowAPI), security headers, CORS allowlist | Sensible defaults out of the box |
| **Images** | Pillow validation/normalization, static serving | Safe uploads behind an S3-ready seam |
| **Quality** | pytest, GitHub Actions CI | Trust rules verified on every push |

---

## 🚀 Quick Start

### Option A — Docker (one command)

> Spins up PostgreSQL + API + frontend, with sample data seeded automatically.

```bash
docker compose up --build        # or: docker-compose up --build
```

- **Web app** → <http://localhost:3000>
- **API docs (Swagger)** → <http://localhost:8000/docs>
- **PostgreSQL** → `localhost:5432` (user / pass / db all `garage`)

Stop with `docker compose down` (add `-v` to also wipe the DB and uploaded images).

> **Notes**
> - `NEXT_PUBLIC_API_URL` is baked into the frontend at build time (see `docker-compose.yml`)
>   and must be reachable by the **browser** (`http://localhost:8000`). Change it there if you
>   deploy elsewhere, then rebuild.
> - The backend seeds on every start via `SEED_ON_START=true`; set it to `false` once you have real data.

### Option B — Run services directly

<details>
<summary><b>Backend</b> (Python 3.11+)</summary>

```bash
cd backend

# Isolated environment (use virtualenv if `python3 -m venv` complains about ensurepip)
python3 -m venv .venv && source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # defaults work out of the box with SQLite
python seed.py                # seed admin + sample garages & cars
uvicorn app.main:app --reload --port 8000
```

API → <http://localhost:8000> · Swagger → <http://localhost:8000/docs>

**Switch to PostgreSQL** — set `DATABASE_URL` in `backend/.env`, then re-run `python seed.py`:
```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/garage
```
Tables are auto-created on startup (no Alembic needed for the MVP).
</details>

<details>
<summary><b>Frontend</b> (Node.js 18+)</summary>

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points at http://localhost:8000
npm run dev
```

App → <http://localhost:3000>
</details>

### Try it in 60 seconds

Seeded accounts (from `seed.py`):

| Role   | Email               | Password    | Notes                          |
|--------|---------------------|-------------|--------------------------------|
| Admin  | `admin@garage.ma`   | `admin123`  | Approves garages, deletes cars |
| Garage | `atlas@garage.ma`   | `garage123` | Approved (Casablanca)          |
| Garage | `medina@garage.ma`  | `garage123` | Approved (Rabat)               |
| Garage | `souss@garage.ma`   | `garage123` | **Pending** approval (Agadir)  |

1. Open the homepage → browse cars, filter, explore the **map** and **nearby search**.
2. Open a car → tap **Contact on WhatsApp** (opens `wa.me` with a prefilled message).
3. Log in as a garage → add a car with photos, watch views/leads on the dashboard.
4. Register a brand-new garage → note it's **pending** and its cars are hidden.
5. Log in as admin → approve it → its cars appear publicly. *(That's the trust rule, live.)*

---

## ✅ Quality & Testing

The backend ships with an **18-test pytest suite** focused on the security-critical
paths — run against a throwaway SQLite database rebuilt before each test, so they're
fast and isolated.

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

- **Trust rules** — a car is public only if its garage is approved, not disabled, and active
  (verified on list + detail endpoints, plus the admin approve/disable flow end-to-end).
- **Authorization** — garages can only edit/delete their own listings; admin routes reject
  anonymous and non-admin callers; disabled accounts are locked out.
- **Auth** — registration issues a token and starts garages unapproved; duplicate emails and
  weak passwords are rejected; login succeeds/fails correctly.

[**GitHub Actions CI**](.github/workflows/ci.yml) runs the full suite on Python 3.11 and a
production Next.js build on every push and pull request.

---

## 📡 API Reference

Base URL `http://localhost:8000` · Auth via `Authorization: Bearer <token>` · Full interactive docs at `/docs`.

<details>
<summary><b>Auth</b></summary>

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | Create a garage account **+ profile**, returns JWT (starts unapproved) |
| POST | `/auth/login` | Returns JWT + role |
</details>

<details>
<summary><b>Public discovery</b></summary>

| Method | Path | Notes |
|--------|------|-------|
| GET | `/cars` | Browse approved & active listings. Filters: `brand, city, min_price, max_price, min_year, search, page, page_size` |
| GET | `/cars/{id}` | Car detail (404 if its garage is unapproved/disabled or the car is inactive) |
| POST | `/cars/{id}/lead` | Record a WhatsApp contact click (public, no auth) |
| GET | `/garages` | Directory of verified garages + active car counts |
| GET | `/garages/nearby?lat=&lng=&radius=` | Verified garages within radius (km), sorted by distance |
| GET | `/garages/{id}` | Public garage profile + its active listings |
</details>

<details>
<summary><b>Garage (auth: garage)</b></summary>

| Method | Path | Notes |
|--------|------|-------|
| GET | `/garage/me` · PUT `/garage/update` | Read/update own profile |
| POST | `/garage/logo` | Upload brand logo |
| GET | `/garage/analytics` · `/garage/leads` | Views, leads, per-car stats |
| GET | `/cars/mine` | All own listings (any status) |
| POST | `/cars` · PUT `/cars/{id}` · DELETE `/cars/{id}` | Manage own listings |
| POST | `/cars/{id}/images` · DELETE `/cars/{id}/images/{imageId}` | Photos (JPEG/PNG/WebP, ≤8 per car) |
</details>

<details>
<summary><b>Admin (auth: admin)</b></summary>

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/garages?approved=` | List garages by approval status |
| POST | `/admin/approve-garage?garage_id=&approve=` | Approve / revoke a garage |
| POST | `/admin/disable-garage?garage_id=&disable=` | Disable / re-enable (hides all its cars) |
| GET | `/admin/cars` · DELETE `/admin/car/{id}` | View / remove any listing |
</details>

---

## 🗃️ Data Model & Trust Rules

```
User ──1:1── GarageProfile ──1:N── CarListing ──1:N── CarImage
 (admin │ garage)                       └──1:N── CarLead (WhatsApp clicks)
AdminActionLog  ← audit trail of every approval / disable / deletion
```

- **User** — `email`, `hashed_password`, `role` (`admin` | `garage`), `is_active`
- **GarageProfile** — name, WhatsApp phone, city, address, geo `lat/lng`, logo, `is_approved`, `is_disabled`
- **CarListing** — brand, model, year, mileage, fuel, transmission, price, `is_active`, `views`
- **CarImage** — stored path served as an absolute URL · **CarLead** — a recorded WhatsApp contact
- **AdminActionLog** — `admin_id`, `action`, `target`

**Trust rules (enforced server-side, covered by tests):**
- A car is **publicly visible only if** its garage is approved **and** not disabled **and** the car is active.
- Garages can edit/delete **only their own** listings.
- New garages start **unapproved** — their inventory stays hidden until an admin approves them.

---

## 🗂️ Project Structure

```
.
├── backend/                     # FastAPI service
│   ├── app/
│   │   ├── main.py              # App wiring: CORS, security headers, rate limiting, routers
│   │   ├── config.py            # Env settings + assert_production_safe()
│   │   ├── models.py            # User, GarageProfile, CarListing, CarImage, CarLead, AdminActionLog
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── security.py / deps.py# JWT + password hashing · auth dependencies
│   │   ├── storage.py           # Image validation & saving (S3 swap point)
│   │   └── routers/             # auth · garage · cars · garages_public · admin
│   ├── tests/                   # pytest: trust rules · authorization · auth
│   ├── seed.py                  # Sample admin + garages + cars
│   └── requirements*.txt
├── frontend/                    # Next.js 14 web app
│   ├── app/                     # Routes (homepage, car, garage dashboard, admin, search)
│   ├── components/              # Maps, galleries, cards, nav
│   └── lib/                     # API client, auth, geo helpers, types
├── docker-compose.yml           # Postgres + API + frontend
└── .github/workflows/ci.yml     # Backend tests + frontend build
```

---

## 🛣️ Roadmap

- [ ] S3-compatible image storage (swap the `storage.py` seam)
- [ ] Alembic migrations (replace `create_all`)
- [ ] Saved searches & email/WhatsApp alerts for buyers
- [ ] Garage subscription tiers & featured listings (monetization)
- [ ] Arabic / French localization
- [ ] Fraud signals on the admin queue

**Going to production:** set a strong `SECRET_KEY` (`openssl rand -hex 32`), switch to
PostgreSQL, move images to object storage, put the API behind HTTPS, and tighten
`CORS_ORIGINS` to your real domain.

---

## 👷 Engineering Notes (for reviewers)

This is a deliberately scoped MVP that prioritizes **correctness and trust** over feature count:

- **Security by default** — JWT auth, bcrypt password hashing, rate limiting, security
  headers, a strict CORS allowlist, and a startup guard that won't boot insecurely in prod.
- **The hardest rule is the most tested one** — visibility logic is centralized in the API
  and pinned by an end-to-end test suite, not left to the UI.
- **Built to evolve** — clean seams for image storage and map provider, and a one-env-var
  path from SQLite to PostgreSQL, so the MVP scales without a rewrite.

---

## 📄 License

[MIT](LICENSE) © watoumi

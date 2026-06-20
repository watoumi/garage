# DevOps & Observability

This document covers the platform engineering around the Garage.ma app:
containers, reverse proxy, CI/CD, and the Prometheus + Grafana monitoring stack.

## Topology

```
                         ┌──────────────┐
   Internet ──:80/:443──▶│    nginx     │  reverse proxy (prod overlay)
                         └──────┬───────┘
                  /             │            /api  /uploads
            ┌─────────────┐     │      ┌──────────────┐
            │  frontend   │◀────┴─────▶│   backend    │  FastAPI + /metrics
            │ (Next.js)   │            │  (uvicorn)   │
            └─────────────┘            └──────┬───────┘
                                              │
                                       ┌──────▼──────┐
                                       │  PostgreSQL │
                                       └─────────────┘

   Monitoring (observability overlay):
   backend /metrics ┐
   cAdvisor         ├─▶ Prometheus ─▶ Grafana (dashboards)
   node-exporter    │
   postgres-exporter┘
```

## Environments

| File | Purpose |
|------|---------|
| `docker-compose.yml` | **Dev** — Postgres + backend + frontend, ports exposed, seeded data, health checks. |
| `docker-compose.observability.yml` | **Monitoring overlay** — Prometheus, Grafana, cAdvisor, node-exporter, postgres-exporter. |
| `docker-compose.prod.yml` | **Prod overlay** — Nginx entrypoint, secrets from `.env`, `ENVIRONMENT=production`, no auto-approve, no seeding. |

```bash
# Dev
docker compose up --build

# Dev + full monitoring
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d --build

# Production-like (fill .env first)
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

| Service | URL (dev) |
|---------|-----------|
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| API metrics | http://localhost:8000/metrics |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin / `GRAFANA_PASSWORD`) |

## CI/CD (`.github/workflows/ci.yml`)

Runs on every push to `main` and every PR:

1. **Backend** — `ruff` lint + `pytest` (Python 3.11, pip cache).
2. **Frontend** — `npm ci` + production `next build` (Node 20, npm cache).
3. **Docker build** — builds the backend and frontend images with Buildx + GitHub
   Actions layer cache (build verification; no push).

## Monitoring — what's collected

| Source | Examples |
|--------|----------|
| FastAPI (`/metrics`) | request rate, latency histogram (p50/p95/p99), error rate by status, in-progress requests, process CPU/memory |
| cAdvisor | per-container CPU, memory, network, filesystem |
| node-exporter | host CPU, memory, disk |
| postgres-exporter | active connections, commits/rollbacks, cache hit ratio |

The Grafana dashboard (`ops/grafana/provisioning/dashboards/garage-api.json`) is
auto-provisioned along with the Prometheus datasource — the stack comes up wired,
no manual setup.

## Secrets management

- Real secrets live in a git-ignored `.env` (see `.env.example`); the backend's
  `assert_production_safe()` refuses to boot in production with default secrets or
  wildcard CORS.
- `SECRET_KEY`, DB password, admin password, and CORS origins are all injected as
  environment variables — never committed.

## Security posture (in the app, not just infra)

JWT auth · role-based access (admin/garage) · bcrypt password hashing · SlowAPI
rate limiting · security-headers middleware · strict CORS allowlist · docs hidden
in production · Nginx as the single HTTPS-ready entrypoint.

## Resume bullets

- Built a containerized monitoring stack (Prometheus, Grafana, cAdvisor,
  node/postgres exporters) instrumenting a FastAPI service for request rate,
  p95 latency, and error-rate SLOs, with auto-provisioned dashboards.
- Designed multi-environment Docker Compose (dev / monitoring / prod overlays)
  with health checks and an Nginx reverse proxy as an HTTPS-ready entrypoint.
- Implemented a GitHub Actions CI pipeline (lint, tests, multi-stage Docker image
  builds with layer caching) gating every pull request.
- Hardened secrets management with env-based injection and a startup guard that
  blocks insecure production configuration.

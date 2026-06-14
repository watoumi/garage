import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import Base, engine, ensure_columns, ensure_extensions
from app.limiter import limiter
from app.routers import admin, auth, cars, garage, garages_public

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("garage")

# Refuse to boot in production with default secrets / wildcard CORS.
settings.assert_production_safe()

# Create tables, then patch in newer columns (MVP: no Alembic migrations).
Base.metadata.create_all(bind=engine)
ensure_columns()
ensure_extensions()

app = FastAPI(
    title="Garage Marketplace API",
    version="1.0.0",
    # Hide interactive docs in production (avoid exposing the full API surface).
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

# ---------- Rate limiting ----------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ---------- Security headers ----------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self)"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# ---------- CORS (explicit origins, no wildcard) ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------- Safe global error handling (no stack traces to clients) ----------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Serve uploaded images as static files at /uploads/...
Path("uploads").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(garage.router)
app.include_router(garages_public.router)
app.include_router(cars.router)
app.include_router(admin.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# SQLite needs a special flag for multi-threaded use (FastAPI runs handlers in threads).
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Set by ensure_extensions(): whether accent-insensitive matching is available.
HAS_UNACCENT = False


def ensure_extensions() -> None:
    """Enable the `unaccent` extension so city/search matching ignores accents
    (e.g. 'Fes' matches 'Fès', 'beni mellal' matches 'Béni Mellal')."""
    global HAS_UNACCENT
    if not engine.url.get_backend_name().startswith("postgresql"):
        return
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
        HAS_UNACCENT = True
    except Exception:
        HAS_UNACCENT = False


def ensure_columns() -> None:
    """Add newer nullable columns in place so existing data isn't wiped.

    Lightweight stand-in for migrations (Postgres supports ADD COLUMN IF NOT EXISTS).
    Must run before any seeding/inserts that reference these columns.
    """
    if not engine.url.get_backend_name().startswith("postgresql"):
        return  # SQLite dev: create_all builds fresh tables with all columns
    stmts = [
        "ALTER TABLE garage_profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
        "ALTER TABLE garage_profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
        "ALTER TABLE garage_profiles ADD COLUMN IF NOT EXISTS logo_path VARCHAR(500)",
        "ALTER TABLE car_listings ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0 NOT NULL",
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass

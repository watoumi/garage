from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET = "change-this-super-secret-key-in-production"
DEFAULT_ADMIN_PASSWORD = "admin123"


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env file."""

    environment: str = "development"  # set ENVIRONMENT=production in prod

    database_url: str = "sqlite:///./garage.db"
    secret_key: str = DEFAULT_SECRET
    access_token_expire_minutes: int = 10080  # 7 days
    algorithm: str = "HS256"

    cors_origins: str = "http://localhost:3000"
    public_base_url: str = "http://localhost:8000"

    admin_email: str = "admin@garage.ma"
    admin_password: str = "admin123"

    # When true, new garages are approved instantly (no admin step). Production-safe
    # default is False (manual verification); set AUTO_APPROVE_GARAGES=true to skip it.
    auto_approve_garages: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def assert_production_safe(self) -> None:
        """Fail fast at startup if production is misconfigured with default secrets."""
        if not self.is_production:
            return
        problems = []
        if self.secret_key == DEFAULT_SECRET:
            problems.append("SECRET_KEY is still the insecure default")
        if self.admin_password == DEFAULT_ADMIN_PASSWORD:
            problems.append("ADMIN_PASSWORD is still the default 'admin123'")
        if "*" in self.cors_origins:
            problems.append("CORS_ORIGINS must list explicit domains, not '*'")
        if problems:
            raise RuntimeError(
                "Refusing to start in production: " + "; ".join(problems)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

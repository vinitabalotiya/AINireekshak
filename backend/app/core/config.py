"""Application configuration using pydantic-settings."""

from pathlib import Path
from pydantic_settings import BaseSettings

_app_dir = Path(__file__).resolve().parent.parent.parent  # backend root
_repo_root = _app_dir.parent  # repository root


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    DATABASE_URL: str = "sqlite+aiosqlite:///./ainireekshak.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    MARITIME_API_KEY: str = ""
    USE_SANDBOX_PARSER: bool = True
    SANDBOX_TIMEOUT_SECONDS: int = 30

    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""

    STORAGE_PATH: str = "./uploads"

    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = {
        "env_file": [
            str(_repo_root / ".env"),
            str(_app_dir / ".env"),
            ".env",
        ],
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS comma-separated string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()

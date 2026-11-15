"""Async database engine, session factory, and base model."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)

_connect_args: dict = {}
if settings.DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    connect_args=_connect_args,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


async def init_db() -> None:
    """Create all tables (used in development / SQLite mode)."""
    # Import models so they register with Base.metadata
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safely migrate new columns in SQLite development mode
        if settings.DATABASE_URL.startswith("sqlite"):
            from sqlalchemy import text
            for col_sql in [
                "ALTER TABLE sessions ADD COLUMN liveness_flag VARCHAR(50) DEFAULT 'PENDING'",
                "ALTER TABLE sessions ADD COLUMN liveness_data JSON",
                "ALTER TABLE sessions ADD COLUMN behavioural_data JSON",
                "ALTER TABLE events ADD COLUMN liveness_settings JSON",
                "ALTER TABLE events ADD COLUMN behaviour_settings JSON",
            ]:
                try:
                    await conn.execute(text(col_sql))
                except Exception:
                    pass
    logger.info("Database tables created successfully.")

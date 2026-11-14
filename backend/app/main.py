"""AiNireekshak FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import (
    admin,
    auth,
    evaluations,
    events,
    health,
    reports,
    sessions,
    submissions,
    teams,
)
from app.core.config import settings
from app.core.database import async_session_factory, init_db
from app.core.security import hash_password, generate_team_access_code
from app.middleware.rate_limit import RateLimitMiddleware
from app.models.admin import AdminUser
from app.models.event import Event
from app.models.team import Team, TeamMember
from app.websocket.handlers import router as ws_router

logging.basicConfig(
    level=logging.INFO if not settings.APP_DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ainireekshak")


async def seed_initial_data() -> None:
    """Create default admin and sample event/team if database is empty."""
    async with async_session_factory() as db:
        # Check AdminUser
        admin_res = await db.execute(select(AdminUser).limit(1))
        admin = admin_res.scalar_one_or_none()

        if not admin:
            default_admin = AdminUser(
                email="admin@ainireekshak.com",
                username="admin",
                password_hash=hash_password("admin123"),
                is_active=True,
            )
            db.add(default_admin)
            await db.commit()
            logger.info("Created default administrator: admin@ainireekshak.com / admin123")

        # Check Event
        event_res = await db.execute(select(Event).limit(1))
        event = event_res.scalar_one_or_none()

        if not event:
            sample_event = Event(
                name="Smart India AI Hackathon 2026",
                description="National multilingual AI hackathon judging session prototype.",
                status="active",
                max_teams=50,
                scoring_weights={
                    "pitch_technical": 60.0,
                    "presentation": 15.0,
                    "code_implementation": 8.0,
                    "feasibility": 7.0,
                    "innovation": 5.0,
                    "problem_relevance": 5.0,
                },
            )
            db.add(sample_event)
            await db.flush()

            # Create sample team
            plain_code = "TEAM-DEMO-2026"
            code_hash = hash_password(plain_code)

            sample_team = Team(
                event_id=sample_event.id,
                name="Team BharatAI",
                project_name="Multilingual Agriculture Voice Assistant",
                project_description="Voice-driven mandi pricing and weather alerts in Hindi and regional dialects.",
                members_count=3,
                access_code_hash=code_hash,
                is_active=True,
            )
            db.add(sample_team)
            await db.flush()

            m1 = TeamMember(team_id=sample_team.id, name="Aarav Sharma", email="aarav@bharatai.org", role="Team Lead")
            m2 = TeamMember(team_id=sample_team.id, name="Pooja Patel", email="pooja@bharatai.org", role="AI Engineer")
            m3 = TeamMember(team_id=sample_team.id, name="Rohan Verma", email="rohan@bharatai.org", role="Backend Dev")
            db.add_all([m1, m2, m3])
            await db.commit()

            logger.info("Created sample event 'Smart India AI Hackathon 2026' with team 'Team BharatAI' (Access Code: %s)", plain_code)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database and seed startup data."""
    logger.info("Initializing database...")
    await init_db()
    await seed_initial_data()
    logger.info("AiNireekshak backend startup complete.")
    yield
    logger.info("AiNireekshak backend shutting down.")


app = FastAPI(
    title="AiNireekshak API",
    description="Multilingual AI-Powered Hackathon Judging Platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if "*" not in cors_origins and "http://localhost:3000" not in cors_origins:
    cors_origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(teams.router)
app.include_router(sessions.router)
app.include_router(submissions.router)
app.include_router(evaluations.router)
app.include_router(reports.router)
app.include_router(health.router)
app.include_router(ws_router)

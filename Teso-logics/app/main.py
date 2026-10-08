from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, search, videos, learning, study_plan
from app.routes import adaptive, admin_questions, multi_subject_revision
from app.core.database import SessionLocal, engine, Base
import app.models  # Register all models in Base.metadata
from app.core.seeder import seed_all
from app.core.revision_seeder import seed_revision_database
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TESO — AI-Powered Adaptive Learning Platform",
    description=(
        "An intelligent adaptive learning system for A/L and O/L students. "
        "Features: Spaced repetition, BKT mastery estimation, burnout detection, "
        "weakness analysis, Duolingo dynamic difficulty question calibration, "
        "multi-subject revision engine, and admin question workbench."
    ),
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — existing
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(videos.router)
app.include_router(learning.router)
app.include_router(study_plan.router)

# Routers — adaptive learning engine
app.include_router(adaptive.router)

# Routers — multi-subject revision & admin question bank
app.include_router(admin_questions.router)
app.include_router(multi_subject_revision.router)


@app.on_event("startup")
async def on_startup():
    """Ensure database tables exist and seed skill graph and question bank on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("TESO: Database tables verified/created.")
    except Exception as e:
        logger.error(f"TESO: Table creation check failed: {e}")

    db = SessionLocal()
    try:
        seed_all(db)
        seed_revision_database(db)
        logger.info("TESO: Startup seeding complete.")
    except Exception as e:
        logger.error(f"TESO: Startup seeding failed: {e}")
    finally:
        db.close()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "platform": "TESO Adaptive Learning Platform",
        "version": "2.0.0",
        "features": [
            "event_tracking",
            "spaced_repetition",
            "bkt_mastery_estimation",
            "burnout_prediction",
            "weakness_detection",
            "adaptive_quiz_engine",
            "ai_recommendations",
            "daily_plan_generation",
            "skill_graph",
        ]
    }


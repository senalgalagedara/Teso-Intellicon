import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db_pool, close_db_pool
from app.errors import AccessLogMiddleware, install_exception_handlers
from app.routers import health, ai, documents, engine, assessments


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database pool
    await init_db_pool()

    # In development, auto-ensure assessment tables and initial fixtures exist
    if settings.ENVIRONMENT == "development":
        try:
            from app.assessment.cli import migrate
            from app.assessment import db
            from sqlalchemy import select
            migrate(db.engine)
            with db.engine.connect() as conn:
                existing_paper = conn.execute(select(db.papers.c.id)).first()
            if not existing_paper:
                from pathlib import Path
                from app.assessment.content import Package, import_package
                from app.assessment.storage import Storage
                fixture_path = Path(__file__).resolve().parent.parent / "fixtures" / "physics-development.json"
                if fixture_path.exists():
                    pkg = Package.model_validate_json(fixture_path.read_text(encoding="utf-8"))
                    import_package(db.engine, pkg, Storage())
        except Exception as e:
            import logging
            logging.getLogger("assessment.startup").warning(f"Could not auto-initialize assessment schema: {e}")

    yield
    # Shutdown: close database pool
    await close_db_pool()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI backend hosting AI services and the TESO Revision Engine for G.C.E. A/L education.",
    lifespan=lifespan
)

# Uniform RFC 9457 problem responses: no internal details ever leak to clients.
install_exception_handlers(app)

# Outermost: attaches X-Request-ID and logs every request.
app.add_middleware(AccessLogMiddleware)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(ai.router)
app.include_router(documents.router)
app.include_router(engine.router) # Revision Engine /v1/*
app.include_router(assessments.router) # Student Assessments /api/assessments/*


@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "active",
        "docs_url": "/docs",
        "endpoints": [
            "/health",
            "/api/ai/chat",
            "/api/ai/analyze",
            "/api/ai/embeddings",
            "/api/documents/process",
            "/v1/practice/next",
            "/v1/attempts/process",
            "/v1/reviews/due",
            "/v1/students/{id}/progress",
            "/v1/students/{id}/peer-diagnostic",
            "/v1/courses/{id}/item-stats",
            "/v1/courses/{id}/zscores",
            "/v1/admin/jobs/{name}"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

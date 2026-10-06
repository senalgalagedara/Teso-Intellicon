from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.errors import AccessLogMiddleware, install_exception_handlers
from app.routers import health, ai, documents, assessments

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI backend providing AI endpoints and Supabase integration for Next.js frontend.",
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
app.include_router(assessments.router)

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
            "/api/documents/process"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

from fastapi import APIRouter
from app.config import settings
from app.schemas import HealthResponse
from app.services.supabase_service import supabase_service
from app.services.ai_service import ai_service

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
async def check_health():
    return HealthResponse(
        status="online",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        supabase_configured=supabase_service.is_configured,
        ai_configured=ai_service.is_configured,
    )

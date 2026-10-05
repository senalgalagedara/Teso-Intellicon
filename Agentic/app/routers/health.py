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
        assessment_ai_provider=settings.AI_PROVIDER,
        assessment_ai_model=settings.AI_MODEL if settings.AI_PROVIDER != 'mock' else 'reviewed-local-mock',
        assessment_ai_configured=settings.AI_PROVIDER == 'aimlapi' and bool(settings.AI_API_KEY),
    )

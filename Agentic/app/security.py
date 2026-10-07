from fastapi import Header, HTTPException, status
from app.config import settings

async def verify_engine_key(x_engine_key: str = Header(..., alias="X-Engine-Key")):
    """
    Enforces X-Engine-Key authentication for internal server-to-server revision engine routes.
    """
    if not settings.ENGINE_API_KEY or x_engine_key != settings.ENGINE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Engine-Key header."
        )
    return x_engine_key

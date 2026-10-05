import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    PROJECT_NAME: str = "FastAPI AI Engine"
    VERSION: str = "1.0.0"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Supabase
    SUPABASE_URL: str = "https://your-project-id.supabase.co"
    SUPABASE_KEY: str = "your-supabase-key"
    SUPABASE_STORAGE_BUCKET: str = "app-storage"
    
    # AI Providers
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    DEFAULT_AI_MODEL: str = "gpt-4o-mini"

    # Assessment service: explicit provider, no automatic mock on live failures.
    DATABASE_URL: str = "sqlite:///./teso-dev.db"
    ASSESSMENT_BRIDGE_SECRET: str = ""
    ALLOW_DEVELOPMENT_CONTENT: bool = False
    AI_PROVIDER: str = "mock"
    AI_API_KEY: str = ""
    AI_BASE_URL: str = "https://api.aimlapi.com/v1"
    AI_MODEL: str = "gpt-4o-mini"
    AI_VISION_ENABLED: bool = True
    AI_REQUEST_TIMEOUT_SECONDS: float = 30
    AI_MAX_OUTPUT_TOKENS: int = 1200
    AI_MAX_RETRIES: int = 3
    JOB_LEASE_SECONDS: int = 180
    ASSESSMENT_STORAGE_BUCKET: str = "teso-assessments"
    MEDIA_MAX_BYTES: int = 5 * 1024 * 1024
    MEDIA_MAX_PIXELS: int = 20_000_000
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()

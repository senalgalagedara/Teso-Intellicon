import os
from pydantic_settings import BaseSettings
from typing import List, Tuple, Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Teso Intellicon & Revision Engine"
    VERSION: str = "1.0.0"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Revision Engine & Database
    DATABASE_URL: Optional[str] = None
    ENGINE_API_KEY: str = "dev-secret-change-me"
    
    # Selector weights: (w1_topic_need, w2_difficulty_fit, w3_due_bonus, w4_novelty)
    SELECTOR_WEIGHTS: Tuple[float, float, float, float] = (0.4, 0.3, 0.2, 0.1)
    
    # Supabase (auxiliary storage)
    SUPABASE_URL: str = "https://your-project-id.supabase.co"
    SUPABASE_KEY: str = "your-supabase-key"
    SUPABASE_STORAGE_BUCKET: str = "app-storage"
    
    # AI Providers (existing, separate from revision engine)
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    DEFAULT_AI_MODEL: str = "gpt-4o-mini"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = (".env", "../.env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

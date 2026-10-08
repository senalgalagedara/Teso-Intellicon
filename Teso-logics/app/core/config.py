import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Teso YouTube Learning Platform"
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY")
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    REDIS_URL: str = os.getenv("REDIS_URL")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://your-supabase-id.supabase.co")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkey")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", 7))
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@teso.lk")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "TesoAdminSecret2026!")
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "teso_secret_admin_master_key_99")

settings = Settings()

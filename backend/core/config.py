from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Base Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    
    # Logging
    LOG_DIR: Path = BASE_DIR / "log"
    
    # Storage Subdirectories
    CONFIGS_DIR: Path = STORAGE_DIR / "configs"
    UPLOADS_DIR: Path = STORAGE_DIR / "uploads"
    EXPORTS_DIR: Path = STORAGE_DIR / "exports"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{STORAGE_DIR}/netops.db"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENCRYPTION_KEY: str = "" # For Nornir password encryption
    
    # App Info
    PROJECT_NAME: str = "NetOps Platform"
    VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
settings.CONFIGS_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

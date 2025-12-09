# MODIFICATO: 2025-12-07
# - Fix compatibilità Pydantic v2: sostituito model_post_init con @model_validator
# - Aggiunto type hint 'Settings' al return del validator
# - Import di model_validator da pydantic

from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional, Any

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Enterprise Platform"
    
    # Database (Variabili singole passate da Docker Compose)
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: Optional[str] = None
    
    # External Services
    QDRANT_URL: str
    OLLAMA_BASE_URL: str # Es: http://192.168.1.243:11434

    # Costruzione dinamica dell'URL del database (Fix per Pydantic v2)
    @model_validator(mode='after')
    def build_database_url(self) -> 'Settings':
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
        return self

    class Config:
        case_sensitive = True

settings = Settings()

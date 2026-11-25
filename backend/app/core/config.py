from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "ResearchMate AI API"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "research-papers"

    # Google Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_PRIMARY_MODEL: str = "gemini-3-flash-preview"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.5-flash-lite"

    # RAG & Vector DB
    EMBEDDING_PROVIDER: str = "gemini"
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"

    CHROMA_MODE: str = "persistent"
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    CHROMA_COLLECTION_NAME: str = "researchmate_chunks"
    CHROMA_HOST: str = ""
    CHROMA_PORT: int = 8000
    CHROMA_API_KEY: str = ""
    CHROMA_TENANT: str = ""
    CHROMA_DATABASE: str = ""

    # Uploads & External APIs
    MAX_UPLOAD_SIZE_MB: int = 25
    SEMANTIC_SCHOLAR_API_KEY: str = ""
    ARXIV_CONTACT_EMAIL: str = "researchmate@example.com"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

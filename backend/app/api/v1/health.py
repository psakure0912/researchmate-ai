from fastapi import APIRouter
from app.core.config import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "chroma_mode": settings.CHROMA_MODE,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
    }

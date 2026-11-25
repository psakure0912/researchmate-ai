from fastapi import APIRouter
from app.api.v1 import (
    chat,
    discover,
    documents,
    exports,
    gap_analysis,
    health,
    literature_review,
    profile,
    summaries,
    workspaces,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(profile.router)
api_router.include_router(workspaces.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(summaries.router)
api_router.include_router(literature_review.router)
api_router.include_router(gap_analysis.router)
api_router.include_router(discover.router)
api_router.include_router(exports.router)

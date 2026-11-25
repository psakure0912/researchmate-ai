from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import logger
from app.core.rate_limit import enforce_api_rate_limit

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Modular FastAPI backend for ResearchMate AI (RAG, Gemini, Supabase, Semantic Scholar & arXiv).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred."},
    )


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "docs": "/docs",
        "health": "/api/v1/health",
    }


app.include_router(api_router, dependencies=[Depends(enforce_api_rate_limit)])

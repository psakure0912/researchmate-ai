from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import Settings, get_settings
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.models.schemas import SavePaperRequest
from app.services.academic_apis import search_academic_papers

router = APIRouter(prefix="/discover", tags=["Academic Discovery"])


@router.get("/search")
async def search_papers(
    q: str = Query(..., min_length=2, max_length=240),
    source: Literal["both", "semantic_scholar", "arxiv"] = "both",
    limit: int = Query(default=10, ge=1, le=25),
    year_from: Optional[int] = Query(default=None, ge=1900, le=2030),
    _user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    try:
        return await search_academic_papers(
            query=q.strip(),
            source=source,
            settings=settings,
            limit=limit,
            year_from=year_from,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Academic API request failed: {exc}")


@router.get("/saved")
async def list_saved_papers(
    workspace_id: Optional[str] = None,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    query = sb.table("saved_papers").select("*").eq("user_id", user.id)
    if workspace_id:
        query = query.eq("workspace_id", workspace_id)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.post("/save", status_code=status.HTTP_201_CREATED)
async def save_paper(
    payload: SavePaperRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    record = {
        "user_id": user.id,
        "workspace_id": payload.workspace_id,
        "source": payload.source,
        "external_id": payload.external_id,
        "title": payload.title,
        "authors": payload.authors,
        "abstract": payload.abstract,
        "publication_year": payload.publication_year,
        "published_date": payload.published_date,
        "url": payload.url,
        "pdf_url": payload.pdf_url,
        "citation_count": payload.citation_count,
    }
    res = (
        sb.table("saved_papers")
        .upsert(record, on_conflict="user_id,source,external_id")
        .execute()
    )
    return res.data[0]

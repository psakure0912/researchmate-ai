from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.rate_limit import llm_rate_limiter
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.models.schemas import MultiDocAnalysisRequest
from app.services.analysis_service import ResearchAnalysisService

router = APIRouter(prefix="/literature-review", tags=["Literature Review"])


@router.get("")
async def list_literature_reviews(
    workspace_id: Optional[str] = None,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    query = sb.table("literature_reviews").select("*").eq("user_id", user.id)
    if workspace_id:
        query = query.eq("workspace_id", workspace_id)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_literature_review(
    payload: MultiDocAnalysisRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    llm_rate_limiter.check(f"llm:{user.id}")
    sb = get_supabase_user_client(settings, user.token)

    docs_res = (
        sb.table("documents")
        .select("*")
        .eq("user_id", user.id)
        .eq("workspace_id", payload.workspace_id)
        .in_("id", payload.document_ids)
        .execute()
    )
    docs = [d for d in (docs_res.data or []) if d.get("processing_status") == "ready"]
    if len(docs) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 ready documents in the workspace are required.",
        )

    try:
        rows = ResearchAnalysisService(settings).generate_literature_review(
            user_id=user.id,
            doc_records=docs,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    saved = (
        sb.table("literature_reviews")
        .insert(
            {
                "user_id": user.id,
                "workspace_id": payload.workspace_id,
                "title": payload.title.strip(),
                "document_ids": [d["id"] for d in docs],
                "comparison_matrix": rows,
            }
        )
        .execute()
    )
    return saved.data[0]

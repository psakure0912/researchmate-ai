from fastapi import APIRouter, Depends, HTTPException
from app.core.config import Settings, get_settings
from app.core.rate_limit import llm_rate_limiter
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.services.analysis_service import ResearchAnalysisService

router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.post("/{document_id}")
async def get_or_generate_summary(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)

    doc_res = (
        sb.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc = doc_res.data
    if doc.get("processing_status") != "ready":
        raise HTTPException(status_code=400, detail="Document is not ready for summarization.")

    existing = (
        sb.table("document_summaries")
        .select("*")
        .eq("document_id", document_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return {
            "id": existing.data["id"],
            "document_id": document_id,
            "document_title": doc["title"],
            **existing.data["summary_data"],
            "created_at": existing.data["created_at"],
        }

    llm_rate_limiter.check(f"llm:{user.id}")
    try:
        summary_data = ResearchAnalysisService(settings).summarize_document(
            user_id=user.id,
            doc_record=doc,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    saved = (
        sb.table("document_summaries")
        .insert(
            {
                "document_id": document_id,
                "user_id": user.id,
                "workspace_id": doc["workspace_id"],
                "summary_data": summary_data,
            }
        )
        .execute()
    )
    row = saved.data[0]
    return {
        "id": row["id"],
        "document_id": document_id,
        "document_title": doc["title"],
        **summary_data,
        "created_at": row["created_at"],
    }

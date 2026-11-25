from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.rate_limit import llm_rate_limiter
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.models.schemas import AskQuestionRequest, SessionCreate
from app.services.rag_pipeline import RAGPipeline

router = APIRouter(prefix="/chat", tags=["AI Research Chat"])


@router.get("/sessions")
async def list_sessions(
    workspace_id: Optional[str] = None,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    query = sb.table("research_sessions").select("*").eq("user_id", user.id)
    if workspace_id:
        query = query.eq("workspace_id", workspace_id)
    res = query.order("updated_at", desc=True).execute()
    return res.data or []


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    ws_check = (
        sb.table("workspaces")
        .select("id")
        .eq("id", payload.workspace_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not ws_check.data:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    res = (
        sb.table("research_sessions")
        .insert(
            {
                "user_id": user.id,
                "workspace_id": payload.workspace_id,
                "title": payload.title.strip(),
            }
        )
        .execute()
    )
    return res.data[0]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    sess = (
        sb.table("research_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not sess.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    res = (
        sb.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", user.id)
        .order("created_at", desc=False)
        .execute()
    )
    return res.data or []


@router.post("/sessions/{session_id}/ask")
async def ask_question(
    session_id: str,
    payload: AskQuestionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    llm_rate_limiter.check(f"llm:{user.id}")
    sb = get_supabase_user_client(settings, user.token)

    sess_res = (
        sb.table("research_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not sess_res.data:
        raise HTTPException(status_code=404, detail="Research session not found.")

    workspace_id = sess_res.data["workspace_id"]

    # Fetch recent conversation history for contextual follow-ups
    history_res = (
        sb.table("chat_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .eq("user_id", user.id)
        .order("created_at", desc=False)
        .execute()
    )
    chat_history = history_res.data or []

    # Persist user message
    sb.table("chat_messages").insert(
        {
            "session_id": session_id,
            "user_id": user.id,
            "role": "user",
            "content": payload.question.strip(),
            "citations": [],
        }
    ).execute()

    rag = RAGPipeline(settings)
    try:
        answer, citations = rag.answer_question(
            user_id=user.id,
            workspace_id=workspace_id,
            question=payload.question.strip(),
            chat_history=chat_history,
            document_ids=payload.document_ids,
            top_k=payload.top_k,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    assistant_res = (
        sb.table("chat_messages")
        .insert(
            {
                "session_id": session_id,
                "user_id": user.id,
                "role": "assistant",
                "content": answer,
                "citations": citations,
            }
        )
        .execute()
    )

    # Touch session updated_at / title if default
    if len(chat_history) == 0 and sess_res.data.get("title") == "New Research Session":
        sb.table("research_sessions").update(
            {"title": payload.question.strip()[:60]}
        ).eq("id", session_id).execute()
    else:
        sb.table("research_sessions").update({"title": sess_res.data["title"]}).eq(
            "id", session_id
        ).execute()

    return assistant_res.data[0]

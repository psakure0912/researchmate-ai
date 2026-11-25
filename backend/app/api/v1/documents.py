import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.services.pdf_processor import extract_pdf_pages, validate_pdf_bytes
from app.services.rag_pipeline import RAGPipeline

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("")
async def list_documents(
    workspace_id: Optional[str] = None,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    query = sb.table("documents").select("*").eq("user_id", user.id)
    if workspace_id:
        query = query.eq("workspace_id", workspace_id)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    workspace_id: str = Form(...),
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)

    # Verify workspace ownership
    ws_check = (
        sb.table("workspaces")
        .select("id")
        .eq("id", workspace_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not ws_check.data:
        raise HTTPException(status_code=404, detail="Target workspace not found.")

    filename = file.filename or "research_paper.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    try:
        validate_pdf_bytes(file_bytes, settings.MAX_UPLOAD_SIZE_MB)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    doc_id = str(uuid.uuid4())
    storage_path = f"{user.id}/{workspace_id}/{doc_id}.pdf"
    fallback_title = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()

    # Upload raw PDF to private Supabase Storage bucket
    try:
        sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as exc:
        logger.error("Supabase Storage upload failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {exc}")

    # Insert initial processing record
    sb.table("documents").insert(
        {
            "id": doc_id,
            "user_id": user.id,
            "workspace_id": workspace_id,
            "title": fallback_title,
            "file_name": filename,
            "file_size_bytes": len(file_bytes),
            "storage_path": storage_path,
            "processing_status": "processing",
        }
    ).execute()

    try:
        extracted = extract_pdf_pages(file_bytes, fallback_title=fallback_title)
        rag = RAGPipeline(settings)
        chunk_count = rag.index_document(
            user_id=user.id,
            workspace_id=workspace_id,
            document_id=doc_id,
            document_title=extracted.title,
            pages=extracted.pages,
        )
        updated = (
            sb.table("documents")
            .update(
                {
                    "title": extracted.title,
                    "authors": extracted.authors,
                    "page_count": extracted.page_count,
                    "chunk_count": chunk_count,
                    "metadata": extracted.metadata,
                    "processing_status": "ready",
                }
            )
            .eq("id", doc_id)
            .eq("user_id", user.id)
            .execute()
        )
        return updated.data[0]
    except Exception as exc:
        logger.exception("PDF processing/indexing failed for %s", doc_id)
        sb.table("documents").update(
            {
                "processing_status": "failed",
                "error_message": str(exc)[:500],
            }
        ).eq("id", doc_id).eq("user_id", user.id).execute()
        raise HTTPException(
            status_code=422,
            detail=f"PDF uploaded but processing failed: {exc}",
        )


@router.get("/{document_id}/download")
async def get_download_url(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    doc_res = (
        sb.table("documents")
        .select("storage_path")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    signed = sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(
        doc_res.data["storage_path"], 300
    )
    url = signed.get("signedURL") or signed.get("signedUrl")
    if not url:
        raise HTTPException(status_code=500, detail="Could not generate download URL.")
    return {"url": url}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    doc_res = (
        sb.table("documents")
        .select("storage_path")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    RAGPipeline(settings).delete_document_vectors(user_id=user.id, document_id=document_id)
    try:
        sb.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove(
            [doc_res.data["storage_path"]]
        )
    except Exception as exc:
        logger.warning("Storage removal warning for %s: %s", document_id, exc)

    sb.table("documents").delete().eq("id", document_id).eq("user_id", user.id).execute()
    return None

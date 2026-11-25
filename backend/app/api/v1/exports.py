from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.config import Settings, get_settings
from app.core.security import AuthenticatedUser, get_current_user
from app.db.supabase_client import get_supabase_user_client
from app.services.export_service import (
    export_gap_report_csv,
    export_gap_report_pdf,
    export_literature_review_csv,
    export_literature_review_pdf,
    export_summary_pdf,
)

router = APIRouter(prefix="/exports", tags=["Exports"])


@router.get("/summary/{document_id}/pdf")
async def download_summary_pdf(
    document_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    doc_res = (
        sb.table("documents")
        .select("title")
        .eq("id", document_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    sum_res = (
        sb.table("document_summaries")
        .select("summary_data")
        .eq("document_id", document_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data or not sum_res.data:
        raise HTTPException(status_code=404, detail="Summary not found.")

    pdf_bytes = export_summary_pdf(doc_res.data["title"], sum_res.data["summary_data"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="paper_summary.pdf"'},
    )


@router.get("/literature-review/{review_id}/csv")
async def download_literature_review_csv(
    review_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("literature_reviews")
        .select("*")
        .eq("id", review_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Literature review not found.")

    csv_bytes = export_literature_review_csv(res.data["comparison_matrix"])
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="literature_review.csv"'},
    )


@router.get("/literature-review/{review_id}/pdf")
async def download_literature_review_pdf(
    review_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("literature_reviews")
        .select("*")
        .eq("id", review_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Literature review not found.")

    pdf_bytes = export_literature_review_pdf(
        res.data["title"], res.data["comparison_matrix"]
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="literature_review.pdf"'},
    )


@router.get("/gap-report/{report_id}/csv")
async def download_gap_report_csv(
    report_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("research_gap_reports")
        .select("*")
        .eq("id", report_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Gap report not found.")

    csv_bytes = export_gap_report_csv(res.data["report_data"])
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="research_gap_report.csv"'},
    )


@router.get("/gap-report/{report_id}/pdf")
async def download_gap_report_pdf(
    report_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    sb = get_supabase_user_client(settings, user.token)
    res = (
        sb.table("research_gap_reports")
        .select("*")
        .eq("id", report_id)
        .eq("user_id", user.id)
        .maybe_single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Gap report not found.")

    pdf_bytes = export_gap_report_pdf(res.data["title"], res.data["report_data"])
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="research_gap_report.pdf"'},
    )

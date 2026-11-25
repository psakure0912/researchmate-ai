from typing import Any, Dict, List

from app.core.config import Settings
from app.models.schemas import (
    LiteratureComparisonOutput,
    ResearchGapOutput,
    StructuredSummarySchema,
)
from app.services.llm_service import GeminiLLMService
from app.services.rag_pipeline import RAGPipeline


class ResearchAnalysisService:
    """Generates structured paper summaries, literature matrices, and research gap reports."""

    def __init__(self, settings: Settings) -> None:
        self.rag = RAGPipeline(settings)
        self.llm = GeminiLLMService(settings)

    def summarize_document(
        self,
        user_id: str,
        doc_record: Dict[str, Any],
    ) -> Dict[str, Any]:
        doc_id = doc_record["id"]
        title = doc_record["title"]
        text = self.rag.get_document_representative_text(user_id=user_id, document_id=doc_id)
        if not text:
            raise ValueError("No indexed text chunks found for this document.")

        system_prompt = (
            "You are an expert academic summarizer. Extract a structured, accurate, non-fabricated "
            "summary strictly from the provided paper excerpts. If a field is not mentioned, state 'Not explicitly specified in paper'."
        )
        user_prompt = f"Paper Title: {title}\n\nPaper Excerpts:\n{text}"

        return self.llm.generate_structured(
            system_instruction=system_prompt,
            user_prompt=user_prompt,
            response_schema=StructuredSummarySchema,
        )

    def generate_literature_review(
        self,
        user_id: str,
        doc_records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        paper_blocks: List[str] = []
        for doc in doc_records:
            excerpt = self.rag.get_document_representative_text(
                user_id=user_id,
                document_id=doc["id"],
                max_chars=9000,
            )
            paper_blocks.append(
                f"=== PAPER ===\n"
                f"document_id: {doc['id']}\n"
                f"title: {doc['title']}\n"
                f"publication_year: {doc.get('publication_year') or 'Unknown'}\n"
                f"excerpts:\n{excerpt}"
            )

        system_prompt = (
            "You are an academic literature review specialist. Produce one structured comparison row "
            "for each provided paper using ONLY facts evidenced in its excerpts. Preserve exact document_id values."
        )
        user_prompt = "\n\n".join(paper_blocks)

        result = self.llm.generate_structured(
            system_instruction=system_prompt,
            user_prompt=user_prompt,
            response_schema=LiteratureComparisonOutput,
        )
        return result.get("rows", [])

    def generate_gap_analysis(
        self,
        user_id: str,
        doc_records: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        paper_blocks: List[str] = []
        for doc in doc_records:
            excerpt = self.rag.get_document_representative_text(
                user_id=user_id,
                document_id=doc["id"],
                max_chars=9000,
            )
            paper_blocks.append(
                f"=== PAPER: {doc['title']} (id={doc['id']}) ===\n{excerpt}"
            )

        system_prompt = (
            "You are an academic research gap analyst. Analyze all papers together and clearly separate:\n"
            "1. evidence_backed_gaps: underexplored areas or limitations explicitly supported by the uploaded papers, "
            "citing paper titles/pages in supporting_references.\n"
            "2. ai_suggested_opportunities: novel future directions inferred by synthesizing across studies."
        )
        user_prompt = "\n\n".join(paper_blocks)

        return self.llm.generate_structured(
            system_instruction=system_prompt,
            user_prompt=user_prompt,
            response_schema=ResearchGapOutput,
        )

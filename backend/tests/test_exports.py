from app.services.export_service import (
    export_gap_report_csv,
    export_gap_report_pdf,
    export_literature_review_csv,
    export_literature_review_pdf,
    export_summary_pdf,
)


def test_export_summary_pdf_generates_valid_pdf():
    pdf_bytes = export_summary_pdf(
        "Sample Paper",
        {
            "abstract_summary": "Summary text",
            "problem_statement": "Problem",
            "research_objectives": ["Obj 1"],
            "proposed_methodology": "Method",
            "dataset": "PubMedQA",
            "algorithms_used": ["BM25", "Dense Retrieval"],
            "experimental_results": "92% F1",
            "limitations": ["Small sample"],
            "future_scope": ["Multilingual"],
        },
    )
    assert pdf_bytes.startswith(b"%PDF-")


def test_export_literature_review_csv_and_pdf():
    rows = [
        {
            "title": "Paper A",
            "publication_year": "2024",
            "research_objectives": "Improve RAG",
            "methodology": "Hybrid search",
            "dataset": "Natural Questions",
            "algorithms_or_techniques": "DPR",
            "results": "85% EM",
            "limitations": "Latency",
            "research_gaps": "Cross-lingual retrieval",
        }
    ]
    csv_bytes = export_literature_review_csv(rows)
    assert b"Paper A" in csv_bytes
    assert b"Cross-lingual retrieval" in csv_bytes

    pdf_bytes = export_literature_review_pdf("Survey", rows)
    assert pdf_bytes.startswith(b"%PDF-")


def test_export_gap_report_csv_and_pdf():
    report = {
        "common_themes": ["RAG grounding"],
        "existing_approaches": ["Dense vector search"],
        "frequent_methodologies": ["Chunk + Retrieve"],
        "shared_limitations": ["Context drift"],
        "evidence_backed_gaps": [
            {
                "gap_title": "Long-context math reasoning",
                "description": "Under-evaluated on multi-page proofs.",
                "supporting_references": ["Paper A, p. 8"],
            }
        ],
        "ai_suggested_opportunities": [
            {
                "direction_title": "Symbolic verification layer",
                "rationale": "Combine proof checkers with RAG.",
                "potential_impact": "Reduces hallucinated derivations.",
            }
        ],
    }
    csv_bytes = export_gap_report_csv(report)
    assert b"Long-context math reasoning" in csv_bytes
    pdf_bytes = export_gap_report_pdf("Gap Study", report)
    assert pdf_bytes.startswith(b"%PDF-")

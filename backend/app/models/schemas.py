from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    institution: Optional[str] = None
    research_field: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    topic_tags: List[str] = Field(default_factory=list)


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    topic_tags: Optional[List[str]] = None


class SessionCreate(BaseModel):
    workspace_id: str
    title: str = Field(default="New Research Session", min_length=1, max_length=160)


class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    document_ids: Optional[List[str]] = None
    top_k: int = Field(default=6, ge=1, le=15)


class CitationItem(BaseModel):
    document_id: str
    document_title: str
    page_number: int
    snippet: str
    score: Optional[float] = None


class StructuredSummarySchema(BaseModel):
    abstract_summary: str
    problem_statement: str
    research_objectives: List[str]
    proposed_methodology: str
    dataset: str
    algorithms_used: List[str]
    experimental_results: str
    limitations: List[str]
    future_scope: List[str]


class MultiDocAnalysisRequest(BaseModel):
    workspace_id: str
    title: str = Field(..., min_length=1, max_length=180)
    document_ids: List[str] = Field(..., min_length=2, max_length=12)


class LiteratureComparisonRow(BaseModel):
    document_id: str
    title: str
    publication_year: str
    research_objectives: str
    methodology: str
    dataset: str
    algorithms_or_techniques: str
    results: str
    limitations: str
    research_gaps: str


class LiteratureComparisonOutput(BaseModel):
    rows: List[LiteratureComparisonRow]


class EvidenceBackedGap(BaseModel):
    gap_title: str
    description: str
    supporting_references: List[str]


class SuggestedDirection(BaseModel):
    direction_title: str
    rationale: str
    potential_impact: str


class ResearchGapOutput(BaseModel):
    common_themes: List[str]
    existing_approaches: List[str]
    frequent_methodologies: List[str]
    shared_limitations: List[str]
    evidence_backed_gaps: List[EvidenceBackedGap]
    ai_suggested_opportunities: List[SuggestedDirection]


class SavePaperRequest(BaseModel):
    workspace_id: Optional[str] = None
    source: Literal["semantic_scholar", "arxiv"]
    external_id: str
    title: str
    authors: List[str] = Field(default_factory=list)
    abstract: Optional[str] = None
    publication_year: Optional[int] = None
    published_date: Optional[str] = None
    url: str
    pdf_url: Optional[str] = None
    citation_count: Optional[int] = None

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  institution: string | null;
  research_field: string | null;
  avatar_url: string | null;
  preferences: {
    theme?: "light" | "dark";
    default_summary_style?: "concise" | "detailed";
  };
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  topic_tags: string[];
  document_count?: number;
  session_count?: number;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus = "pending" | "processing" | "ready" | "failed";

export interface ResearchDocument {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  file_name: string;
  file_size_bytes: number;
  page_count: number;
  chunk_count: number;
  storage_path: string;
  processing_status: ProcessingStatus;
  error_message: string | null;
  authors: string | null;
  publication_year: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  document_id: string;
  document_title: string;
  page_number: number;
  snippet: string;
  score?: number;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface StructuredSummary {
  id?: string;
  document_id: string;
  document_title?: string;
  abstract_summary: string;
  problem_statement: string;
  research_objectives: string[];
  proposed_methodology: string;
  dataset: string;
  algorithms_used: string[];
  experimental_results: string;
  limitations: string[];
  future_scope: string[];
  created_at?: string;
}

export interface LiteratureComparisonRow {
  document_id: string;
  title: string;
  publication_year: string;
  research_objectives: string;
  methodology: string;
  dataset: string;
  algorithms_or_techniques: string;
  results: string;
  limitations: string;
  research_gaps: string;
}

export interface LiteratureReview {
  id: string;
  workspace_id: string;
  title: string;
  document_ids: string[];
  comparison_matrix: LiteratureComparisonRow[];
  created_at: string;
}

export interface EvidenceBackedGap {
  gap_title: string;
  description: string;
  supporting_references: string[];
}

export interface SuggestedDirection {
  direction_title: string;
  rationale: string;
  potential_impact: string;
}

export interface ResearchGapReport {
  id: string;
  workspace_id: string;
  title: string;
  document_ids: string[];
  report_data: {
    common_themes: string[];
    existing_approaches: string[];
    frequent_methodologies: string[];
    shared_limitations: string[];
    evidence_backed_gaps: EvidenceBackedGap[];
    ai_suggested_opportunities: SuggestedDirection[];
  };
  created_at: string;
}

export interface AcademicPaperResult {
  source: "semantic_scholar" | "arxiv";
  external_id: string;
  title: string;
  authors: string[];
  abstract: string | null;
  publication_year: number | null;
  published_date: string | null;
  url: string;
  pdf_url: string | null;
  citation_count: number | null;
}

export interface SavedPaper extends AcademicPaperResult {
  id: string;
  workspace_id: string | null;
  created_at: string;
}

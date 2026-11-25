from pathlib import Path
from langchain_core.embeddings import Embeddings
from app.core.config import Settings
from app.services.pdf_processor import ExtractedPage
from app.services.rag_pipeline import RAGPipeline


class DeterministicTestEmbeddings(Embeddings):
    """Lightweight deterministic embedding vector for offline unit testing."""

    def _vec(self, text: str) -> list[float]:
        lowered = text.lower()
        return [
            1.0 if "transformer" in lowered or "attention" in lowered else 0.1,
            1.0 if "medical" in lowered or "radiology" in lowered else 0.1,
            1.0 if "dataset" in lowered or "bleu" in lowered else 0.1,
            float((len(lowered) % 10) + 1) / 10.0,
        ]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vec(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vec(text)


def test_rag_indexing_and_tenant_isolation(tmp_path: Path):
    settings = Settings(
        CHROMA_MODE="persistent",
        CHROMA_PERSIST_DIR=str(tmp_path / "chroma"),
        CHROMA_COLLECTION_NAME="test_collection",
        GEMINI_API_KEY="dummy-for-unit-test",
    )
    rag = RAGPipeline(settings)
    rag._get_embeddings = lambda: DeterministicTestEmbeddings()

    chunk_count = rag.index_document(
        user_id="user-alpha",
        workspace_id="ws-1",
        document_id="doc-1",
        document_title="Attention Study",
        pages=[
            ExtractedPage(page_number=1, text="Transformer self-attention replaces recurrence."),
            ExtractedPage(page_number=4, text="Evaluated on WMT BLEU dataset benchmarks."),
        ],
    )
    assert chunk_count == 2

    # Same user + workspace retrieves chunks with page metadata
    alpha_hits = rag.retrieve_relevant_chunks(
        user_id="user-alpha",
        workspace_id="ws-1",
        query="How does transformer attention work?",
        top_k=2,
    )
    assert len(alpha_hits) >= 1
    assert alpha_hits[0][0].metadata["document_title"] == "Attention Study"
    assert alpha_hits[0][0].metadata["user_id"] == "user-alpha"

    # Different user MUST see zero chunks (strict tenant isolation)
    beta_hits = rag.retrieve_relevant_chunks(
        user_id="user-beta",
        workspace_id="ws-1",
        query="How does transformer attention work?",
        top_k=2,
    )
    assert beta_hits == []

    # Empty workspace triggers explicit abstention without calling Gemini
    abstention_answer, abstention_citations = rag.answer_question(
        user_id="user-beta",
        workspace_id="ws-1",
        question="What datasets were used?",
        chat_history=[],
    )
    assert "could not find sufficient relevant information" in abstention_answer.lower()
    assert abstention_citations == []

    # Grounded workspace calls LLM with retrieved context and returns document/page citations
    rag.llm.generate_text = lambda system_instruction, user_prompt, temperature=0.2: (
        "Self-attention replaces recurrence [Attention Study, p. 1]."
    )
    answer, citations = rag.answer_question(
        user_id="user-alpha",
        workspace_id="ws-1",
        question="How does transformer attention work?",
        chat_history=[{"role": "user", "content": "Tell me about the architecture."}],
    )
    assert "Attention Study" in answer
    assert len(citations) >= 1
    assert citations[0]["document_title"] == "Attention Study"
    assert citations[0]["page_number"] in (1, 4)

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import Settings
from app.core.logging import logger
from app.services.llm_service import GeminiLLMService
from app.services.pdf_processor import ExtractedPage


RAG_SYSTEM_PROMPT = """You are ResearchMate AI, a rigorous academic research assistant.
Answer the user's question ONLY using the provided retrieved document excerpts and conversation history.

Strict Rules:
1. Ground every factual claim in the retrieved excerpts. Cite sources inline as [Document Title, p. X].
2. If the retrieved excerpts do not contain enough evidence to answer the question, explicitly state:
   "I could not find sufficient information in your uploaded documents to answer this question."
   Do NOT invent findings, citations, datasets, or numbers.
3. Explain technical ideas clearly when the user asks for simple explanations.
"""


class RAGPipeline:
    """Complete 12-step Retrieval-Augmented Generation pipeline using LangChain, ChromaDB, and Gemini."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=180,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        self.llm = GeminiLLMService(settings)
        self._vector_store: Optional[Chroma] = None

    def _get_embeddings(self):
        provider = self.settings.EMBEDDING_PROVIDER.lower()
        if provider == "sentence_transformers":
            from langchain_community.embeddings import HuggingFaceEmbeddings

            return HuggingFaceEmbeddings(
                model_name=self.settings.SENTENCE_TRANSFORMER_MODEL
            )

        if not self.settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is required for Gemini embeddings. Add it to backend/.env."
            )
        return GoogleGenerativeAIEmbeddings(
            model=self.settings.GEMINI_EMBEDDING_MODEL,
            google_api_key=self.settings.GEMINI_API_KEY,
        )

    def _get_chroma_client(self):
        mode = self.settings.CHROMA_MODE.lower()
        if mode == "cloud":
            return chromadb.CloudClient(
                api_key=self.settings.CHROMA_API_KEY,
                tenant=self.settings.CHROMA_TENANT,
                database=self.settings.CHROMA_DATABASE,
            )
        if mode == "http":
            return chromadb.HttpClient(
                host=self.settings.CHROMA_HOST,
                port=self.settings.CHROMA_PORT,
            )
        persist_path = Path(self.settings.CHROMA_PERSIST_DIR)
        persist_path.mkdir(parents=True, exist_ok=True)
        return chromadb.PersistentClient(path=str(persist_path))

    def _get_vector_store(self) -> Chroma:
        if self._vector_store is None:
            client = self._get_chroma_client()
            self._vector_store = Chroma(
                client=client,
                collection_name=self.settings.CHROMA_COLLECTION_NAME,
                embedding_function=self._get_embeddings(),
                collection_metadata={"hnsw:space": "cosine"},
            )
        return self._vector_store

    def index_document(
        self,
        user_id: str,
        workspace_id: str,
        document_id: str,
        document_title: str,
        pages: List[ExtractedPage],
    ) -> int:
        """Steps 4-6: Chunk pages with metadata, generate embeddings, and store in ChromaDB."""
        docs_to_index: List[Document] = []
        chunk_ids: List[str] = []

        global_idx = 0
        for page in pages:
            splits = self.splitter.split_text(page.text)
            for chunk_text in splits:
                chunk_id = f"{document_id}_p{page.page_number}_c{global_idx}"
                docs_to_index.append(
                    Document(
                        page_content=chunk_text,
                        metadata={
                            "user_id": user_id,
                            "workspace_id": workspace_id,
                            "document_id": document_id,
                            "document_title": document_title,
                            "page_number": page.page_number,
                            "chunk_index": global_idx,
                        },
                    )
                )
                chunk_ids.append(chunk_id)
                global_idx += 1

        if not docs_to_index:
            raise ValueError("Document produced zero indexable text chunks.")

        store = self._get_vector_store()
        batch_size = 50
        for start in range(0, len(docs_to_index), batch_size):
            store.add_documents(
                documents=docs_to_index[start : start + batch_size],
                ids=chunk_ids[start : start + batch_size],
            )

        logger.info(
            "Indexed %d chunks for document %s (user=%s, workspace=%s)",
            len(docs_to_index),
            document_id,
            user_id,
            workspace_id,
        )
        return len(docs_to_index)

    def delete_document_vectors(self, user_id: str, document_id: str) -> None:
        """Remove all vector chunks belonging to a deleted document."""
        try:
            client = self._get_chroma_client()
            collection = client.get_or_create_collection(self.settings.CHROMA_COLLECTION_NAME)
            collection.delete(
                where={"$and": [{"user_id": user_id}, {"document_id": document_id}]}
            )
        except Exception as exc:
            logger.warning("Failed deleting vectors for %s: %s", document_id, exc)

    def retrieve_relevant_chunks(
        self,
        user_id: str,
        workspace_id: str,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 6,
    ) -> List[Tuple[Document, float]]:
        """Steps 7-8: Semantic similarity search isolated by user_id & workspace_id."""
        store = self._get_vector_store()

        filters: List[Dict[str, Any]] = [
            {"user_id": user_id},
            {"workspace_id": workspace_id},
        ]
        if document_ids:
            filters.append({"document_id": {"$in": document_ids}})

        where_filter: Dict[str, Any] = (
            filters[0] if len(filters) == 1 else {"$and": filters}
        )

        return store.similarity_search_with_relevance_scores(
            query=query,
            k=top_k,
            filter=where_filter,
        )

    def answer_question(
        self,
        user_id: str,
        workspace_id: str,
        question: str,
        chat_history: List[Dict[str, str]],
        document_ids: Optional[List[str]] = None,
        top_k: int = 6,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Steps 7-12: Retrieve chunks, construct bounded context, invoke Gemini, return citations."""
        results = self.retrieve_relevant_chunks(
            user_id=user_id,
            workspace_id=workspace_id,
            query=question,
            document_ids=document_ids,
            top_k=top_k,
        )

        # Filter out weakly matching chunks if collection is empty or irrelevant
        relevant = [(doc, score) for doc, score in results if score is None or score >= 0.15]
        if not relevant:
            return (
                "I could not find sufficient relevant information in your uploaded documents for this workspace to answer that question.",
                [],
            )

        context_blocks: List[str] = []
        citations: List[Dict[str, Any]] = []
        seen_keys = set()

        for idx, (doc, score) in enumerate(relevant, start=1):
            meta = doc.metadata or {}
            doc_id = str(meta.get("document_id", ""))
            doc_title = str(meta.get("document_title", "Untitled Paper"))
            page_num = int(meta.get("page_number", 1))

            context_blocks.append(
                f"[Excerpt {idx} | Document: {doc_title} | Page: {page_num}]\n{doc.page_content}"
            )

            cite_key = (doc_id, page_num)
            if cite_key not in seen_keys:
                seen_keys.add(cite_key)
                citations.append(
                    {
                        "document_id": doc_id,
                        "document_title": doc_title,
                        "page_number": page_num,
                        "snippet": doc.page_content[:240],
                        "score": round(float(score), 4) if score is not None else None,
                    }
                )

        history_text = ""
        if chat_history:
            recent = chat_history[-6:]
            history_lines = [
                f"{m['role'].upper()}: {m['content']}" for m in recent
            ]
            history_text = "Conversation History:\n" + "\n".join(history_lines) + "\n\n"

        user_prompt = (
            f"{history_text}"
            f"Retrieved Document Excerpts:\n"
            + "\n\n---\n\n".join(context_blocks)
            + f"\n\nUser Question: {question}"
        )

        answer = self.llm.generate_text(
            system_instruction=RAG_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.2,
        )
        return answer, citations

    def get_document_representative_text(
        self,
        user_id: str,
        document_id: str,
        max_chars: int = 18000,
    ) -> str:
        """Fetch ordered chunks from ChromaDB for summarization or multi-paper analysis."""
        client = self._get_chroma_client()
        collection = client.get_or_create_collection(self.settings.CHROMA_COLLECTION_NAME)
        res = collection.get(
            where={"$and": [{"user_id": user_id}, {"document_id": document_id}]},
            include=["documents", "metadatas"],
        )
        docs = res.get("documents") or []
        metas = res.get("metadatas") or []

        paired = sorted(
            zip(docs, metas),
            key=lambda pair: int((pair[1] or {}).get("chunk_index", 0)),
        )
        collected: List[str] = []
        total = 0
        for text, meta in paired:
            page = (meta or {}).get("page_number", "?")
            block = f"[Page {page}] {text}"
            if total + len(block) > max_chars:
                break
            collected.append(block)
            total += len(block)
        return "\n\n".join(collected)

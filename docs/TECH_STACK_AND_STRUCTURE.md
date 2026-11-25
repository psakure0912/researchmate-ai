# ResearchMate AI — Finalised Technology Stack & Project Structure (Stage 2)

## 1. Finalised Technology Stack

### Frontend (`frontend/`)
| Layer | Choice | Version / Notes | Rationale |
| :--- | :--- | :--- | :--- |
| Framework | **Next.js (App Router)** | `15.x` | SSR metadata for WhatsApp/social previews, clean routing, Vercel-native deployment |
| Language | **TypeScript** | `5.x` | Type safety across API DTOs and UI components |
| Styling | **Tailwind CSS** | `3.4.x` / `4.x` | Rapid, consistent SaaS styling (Linear/Notion/Perplexity aesthetic) |
| UI Primitives | **shadcn/ui** + Radix UI | Latest | Accessible, minimal, customizable components |
| Icons | **lucide-react** | Latest | Clean, crisp vector icons |
| Auth Client | **@supabase/supabase-js** + **@supabase/ssr** | Latest | Persistent cookie-based SSR & client sessions |
| Data Fetching | Native `fetch` + typed API client | — | Lightweight, predictable, supports SSE streaming |

### Backend (`backend/`)
| Layer | Choice | Version / Notes | Rationale |
| :--- | :--- | :--- | :--- |
| Runtime | **Python** | `3.11` or `3.12` | Best compatibility with LangChain, ChromaDB, PyMuPDF |
| Web Framework | **FastAPI** + **Uvicorn** | `0.115.x` | Fast async REST APIs, automatic OpenAPI docs, Pydantic validation |
| LLM SDK | **google-genai** & **langchain-google-genai** | Latest stable | Official Google Gemini API + LangChain integration |
| RAG Orchestration | **LangChain** (`langchain-core`, `langchain-text-splitters`, `langchain-chroma`) | `0.3.x` | Standard, modular RAG & splitting primitives |
| Vector Database | **ChromaDB** (`chromadb`) | `0.6.x` / `1.x` | Persistent/Cloud vector store with rich metadata filtering |
| Embeddings | **Gemini Embeddings** (`text-embedding-004` / `gemini-embedding-001`) + optional **SentenceTransformers** (`all-MiniLM-L6-v2`) | Configurable via `EMBEDDING_PROVIDER` | Gemini embeddings avoid 1.5GB+ PyTorch RAM overhead on low-cost 512MB Render/Railway tiers while allowing local SentenceTransformers if desired |
| PDF Extraction & OCR | **PyMuPDF (`pymupdf`)** + **RapidOCR (`rapidocr-onnxruntime`)** | Latest | Fast page-accurate extraction + pure-Python OCR fallback for scanned PDFs without needing OS-level Tesseract binaries |
| External APIs | **httpx** + **xml.etree.ElementTree** | Latest | Async requests with retries/backoff for Semantic Scholar & arXiv |
| Exports | **ReportLab** (`reportlab`) + Python `csv` | Latest | Reliable pure-Python PDF & CSV generation |
| Database / Auth / Storage | **supabase** (Python SDK) + **PyJWT** | Latest | JWT verification, PostgreSQL queries, Storage signed URLs |

### Cloud Infrastructure
- **Database, Auth, Storage**: Supabase (PostgreSQL + RLS + Auth + Storage)
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render or Railway

---

## 2. Project Directory Structure

```text
researchmate-ai/
├── .env.example                    # Complete template of required env vars (no secrets)
├── .gitignore                      # Git ignore rules for Node, Python, envs, local DBs
├── README.md                       # Complete project documentation & guides
├── docs/
│   ├── ARCHITECTURE.md             # Stage 1 system architecture & RAG diagrams
│   ├── TECH_STACK_AND_STRUCTURE.md # Stage 2 stack decisions & directory layout
│   ├── API_DOCUMENTATION.md        # REST API reference (populated as backend is built)
│   └── DEPLOYMENT.md               # Step-by-step Vercel + Render/Railway + Supabase guide
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # PostgreSQL tables, indexes, triggers, RLS policies
├── frontend/                       # Next.js 15 + TypeScript + Tailwind + shadcn/ui
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout + Open Graph metadata
│   │   │   ├── page.tsx            # 1. Public Landing Page
│   │   │   ├── login/page.tsx      # 2. Login Page
│   │   │   ├── register/page.tsx   # 3. Registration Page
│   │   │   ├── auth/callback/      # OAuth callback route
│   │   │   └── (app)/              # Protected SaaS Shell (sidebar + topbar)
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/page.tsx         # 4. Dashboard
│   │   │       ├── workspaces/page.tsx        # 5. Workspaces list
│   │   │       ├── workspaces/[id]/page.tsx   # 5b. Workspace detail hub
│   │   │       ├── chat/page.tsx              # 6. AI Research Chat
│   │   │       ├── documents/page.tsx         # 7. Document Library
│   │   │       ├── literature-review/page.tsx # 8. Literature Review Assistant
│   │   │       ├── discover/page.tsx          # 9. Academic Research Discovery
│   │   │       ├── gap-analysis/page.tsx      # 10. Research Gap Analysis
│   │   │       └── settings/page.tsx          # 11. User Settings
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── layout/             # App sidebar, mobile nav, user menu
│   │   │   ├── landing/            # Hero, features, RAG visual, footer
│   │   │   ├── chat/               # Message bubbles, citation chips, source drawer
│   │   │   ├── documents/          # Drag-drop uploader, paper cards, metadata modal
│   │   │   └── analysis/           # Literature comparison table, gap cards
│   │   ├── lib/
│   │   │   ├── supabase/           # client.ts, server.ts, middleware.ts
│   │   │   └── api.ts              # Typed backend API client
│   │   └── types/                  # Shared TypeScript interfaces
│   └── ...
└── backend/                        # Python FastAPI Modular Backend
    ├── requirements.txt
    ├── pyproject.toml
    ├── Procfile / render.yaml
    ├── app/
    │   ├── main.py                 # FastAPI app entrypoint, CORS, exception handlers
    │   ├── core/
    │   │   ├── config.py           # Pydantic BaseSettings
    │   │   ├── security.py         # Supabase JWT verification & current_user dep
    │   │   ├── rate_limit.py       # API rate limiter
    │   │   └── logging.py          # Structured logging
    │   ├── db/
    │   │   └── supabase_client.py  # Supabase admin/user clients
    │   ├── models/
    │   │   └── schemas.py          # Pydantic request/response models
    │   ├── services/
    │   │   ├── pdf_processor.py    # PyMuPDF + RapidOCR text extraction & cleaning
    │   │   ├── rag_pipeline.py     # LangChain + ChromaDB 12-step RAG pipeline
    │   │   ├── llm_service.py      # Gemini integration, prompts, fallback, streaming
    │   │   ├── academic_apis.py    # Semantic Scholar & arXiv live API clients
    │   │   ├── analysis_service.py # Summarizer, Literature Review, Gap Analysis
    │   │   └── export_service.py   # PDF (ReportLab) & CSV generators
    │   └── api/
    │       └── v1/
    │           ├── router.py
    │           ├── health.py
    │           ├── workspaces.py
    │           ├── documents.py
    │           ├── chat.py
    │           ├── summaries.py
    │           ├── literature_review.py
    │           ├── gap_analysis.py
    │           ├── discover.py
    │           ├── exports.py
    │           └── profile.py
    └── tests/
        ├── test_health.py
        ├── test_pdf_processor.py
        ├── test_rag_pipeline.py
        ├── test_academic_apis.py
        └── test_exports.py
```

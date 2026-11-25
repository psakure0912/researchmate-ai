# ResearchMate AI — Intelligent AI-Powered Research Assistant

ResearchMate AI is a full-stack Generative AI research platform built for college students, researchers, and academic professionals. It pairs a **12-step Retrieval-Augmented Generation (RAG)** pipeline with **Google Gemini**, **Semantic Scholar & arXiv APIs**, and **Supabase** multi-tenant data isolation.

## Why ResearchMate AI? (vs. a Basic Chatbot)
- **Grounded Evidence & Page Citations:** Retrieves relevant PDF chunks from ChromaDB and cites exact document titles and page numbers instead of hallucinating.
- **Abstention When Evidence Is Missing:** Explicitly communicates when uploaded papers lack the answer.
- **Full Research Workflow:** Dedicated tools for 9-part structured paper summaries, multi-paper literature review comparison tables, evidence-backed vs. AI-suggested research gap reports, live paper discovery, and PDF/CSV exports.

## Documentation
- [System Architecture](docs/ARCHITECTURE.md)
- [Technology Stack & Project Structure](docs/TECH_STACK_AND_STRUCTURE.md)
- [REST API Documentation](docs/API_DOCUMENTATION.md)
- [Deployment & API Keys Guide](docs/DEPLOYMENT.md)
- [Database Migration SQL](supabase/migrations/001_initial_schema.sql)

## Local Development

### 1. Backend (FastAPI + LangChain + ChromaDB)
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
# Add your GEMINI_API_KEY in backend/.env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js 15 + Tailwind CSS)
```powershell
cd frontend
npm run dev
```

### 3. Run Tests
```powershell
# Backend tests
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# Frontend checks
cd frontend
npm run typecheck
npm run lint
npm run build
```

## Build Stage Tracker
- [x] **Stage 1**: Requirement Analysis & Complete System Architecture
- [x] **Stage 2**: Finalised Technology Stack & Project Structure
- [x] **Stage 3**: Frontend Design & Implementation (Next.js, TypeScript, Tailwind, 11+ pages)
- [x] **Stage 4**: FastAPI Backend Core & Auth Security
- [x] **Stage 5**: Supabase Project Provisioned (`hlrifrnaujmdlewrerfv`) & Migration SQL Ready
- [x] **Stage 6**: PDF Upload, PyMuPDF Extraction & RapidOCR Fallback
- [x] **Stage 7**: Complete 12-Step RAG Pipeline (LangChain + ChromaDB)
- [x] **Stage 8**: Google Gemini LLM Integration (Chat, Summaries, Literature Review, Gap Analysis)
- [x] **Stage 9**: Semantic Scholar & arXiv Live API Integration
- [x] **Stage 10**: Literature Review & Research Gap Analysis
- [x] **Stage 11**: Frontend–Backend End-to-End Integration
- [x] **Stage 12**: PDF & CSV Export Service
- [x] **Stage 13**: Automated Frontend Build & Backend Unit Tests
- [ ] **Stage 14**: Live End-to-End Verification with User's Gemini Key & Applied SQL Schema
- [ ] **Stage 15**: Public Deployment (Vercel + Render/Railway)
- [ ] **Stage 16**: Live Production Verification (Desktop + Mobile / WhatsApp Link)

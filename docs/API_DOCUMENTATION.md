# ResearchMate AI — API Documentation

Base URL (Local): `http://localhost:8000/api/v1`  
Interactive Swagger UI: `/docs`  
Authentication: Every endpoint except `/api/v1/health` requires `Authorization: Bearer <supabase_jwt>`.

## Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health and vector/embedding mode |
| `GET` | `/profile` | Get authenticated researcher profile |
| `PUT` | `/profile` | Update name, institution, field, and preferences |
| `GET` | `/workspaces` | List user workspaces |
| `POST` | `/workspaces` | Create a new research workspace |
| `GET` | `/workspaces/{id}` | Get workspace metadata |
| `PUT` | `/workspaces/{id}` | Update workspace metadata |
| `DELETE` | `/workspaces/{id}` | Delete workspace and cascade records |
| `GET` | `/documents` | List uploaded PDFs (optional `?workspace_id=`) |
| `POST` | `/documents/upload` | Multipart PDF upload -> Storage -> PyMuPDF/OCR -> LangChain chunks -> ChromaDB |
| `GET` | `/documents/{id}/download` | Generate short-lived signed Supabase Storage download URL |
| `DELETE` | `/documents/{id}` | Delete document from DB, Supabase Storage, and ChromaDB |
| `GET` | `/chat/sessions` | List AI research sessions |
| `POST` | `/chat/sessions` | Create a new research session |
| `GET` | `/chat/sessions/{id}/messages` | Get ordered chat history + citations |
| `POST` | `/chat/sessions/{id}/ask` | Run semantic RAG retrieval + Gemini grounded response + store citations |
| `POST` | `/summaries/{document_id}` | Generate or fetch cached 9-section structured paper summary |
| `GET` | `/literature-review` | List saved literature review matrices |
| `POST` | `/literature-review/generate` | Compare 2+ selected papers into a structured comparison matrix |
| `GET` | `/gap-analysis` | List saved research gap reports |
| `POST` | `/gap-analysis/generate` | Analyze 2+ papers for evidence-backed gaps & AI-suggested directions |
| `GET` | `/discover/search` | Live search across Semantic Scholar & arXiv (`q`, `source`, `limit`, `year_from`) |
| `GET` | `/discover/saved` | List saved discovery papers |
| `POST` | `/discover/save` | Save a Semantic Scholar / arXiv paper to a workspace |
| `GET` | `/exports/summary/{document_id}/pdf` | Download structured summary as PDF |
| `GET` | `/exports/literature-review/{review_id}/csv` | Download literature comparison table as CSV |
| `GET` | `/exports/literature-review/{review_id}/pdf` | Download literature comparison table as PDF |
| `GET` | `/exports/gap-report/{report_id}/csv` | Download research gap report as CSV |
| `GET` | `/exports/gap-report/{report_id}/pdf` | Download research gap report as PDF |

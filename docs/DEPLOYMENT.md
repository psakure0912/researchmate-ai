# ResearchMate AI — Deployment & API Keys Guide

## 1. Required API Keys & Secrets

### A. Google Gemini API Key (Required for AI Chat, Summaries, Literature Review, Gap Analysis & Embeddings)
1. Visit **Google AI Studio**: https://aistudio.google.com/apikey
2. Sign in with your Google account and click **Create API key**.
3. Copy the key into `backend/.env`:
   ```env
   GEMINI_API_KEY=your-key-here
   ```

### B. Supabase Configuration (Project `researchmate-ai` already created!)
Project URL: `https://hlrifrnaujmdlewrerfv.supabase.co`  
Publishable Key: `sb_publishable_Qxaw08iPkIZ7TnSjAHp1SA_zTfFbmtr` (already configured in `frontend/.env.local` and `backend/.env`).

Complete these 2 steps in the **Supabase Dashboard** (`https://supabase.com/dashboard/project/hlrifrnaujmdlewrerfv`):
1. **Apply Database Schema & Storage Bucket**:
   - Open **SQL Editor** -> **New Query**.
   - Paste the entire contents of `supabase/migrations/001_initial_schema.sql` and click **Run**.
2. **Copy Service Role Key (Optional for admin tasks)**:
   - Go to **Project Settings -> API**.
   - Copy the `service_role` secret key (or leave blank if using user-scoped RLS JWTs) into `backend/.env` as `SUPABASE_SERVICE_ROLE_KEY`.
3. **Optional — Enable Google OAuth**:
   - Go to **Authentication -> Providers -> Google**, toggle Enable, and paste your Google Cloud OAuth Client ID & Secret.
   - Add your local & Vercel redirect URLs under **Authentication -> URL Configuration**:
     - `http://localhost:3000/auth/callback`
     - `https://your-vercel-domain.vercel.app/auth/callback`

---

## 2. Backend Deployment (Render or Railway)
1. Push this repository to GitHub (never commit `.env` or `.env.local`!).
2. Create a **New Web Service** on Render (or Railway) pointing to the `backend/` root directory.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set **Persistent Vector Storage**:
   - **Recommended on free tier**: Create a free **Chroma Cloud** database (`CHROMA_MODE=cloud`, `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`) OR mount a persistent disk/volume at `/var/data/chroma` (`CHROMA_MODE=persistent`, `CHROMA_PERSIST_DIR=/var/data/chroma`).
6. Set `CORS_ORIGINS=https://your-vercel-domain.vercel.app`.

---

## 3. Frontend Deployment (Vercel)
1. Import the GitHub repository in **Vercel** and set the Root Directory to `frontend`.
2. Add Environment Variables:
   - `NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app`
   - `NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL=https://hlrifrnaujmdlewrerfv.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Qxaw08iPkIZ7TnSjAHp1SA_zTfFbmtr`
3. Deploy and verify the live HTTPS URL on desktop and mobile (including WhatsApp link preview!).

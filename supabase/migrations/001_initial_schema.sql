-- ============================================
-- ResearchMate AI — Initial Supabase PostgreSQL Schema
-- Hardened with Supabase RLS & Storage Best Practices
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    institution TEXT,
    research_field TEXT,
    avatar_url TEXT,
    preferences JSONB NOT NULL DEFAULT '{"theme": "light", "default_summary_style": "detailed"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Research Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    topic_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Uploaded Research Documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    page_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    storage_path TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
    error_message TEXT,
    authors TEXT,
    publication_year INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Research Chat Sessions
CREATE TABLE IF NOT EXISTS public.research_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Research Session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Chat Messages (with RAG source citations)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.research_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Structured Document Summaries
CREATE TABLE IF NOT EXISTS public.document_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    summary_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, user_id)
);

-- 7. Literature Reviews (Multi-paper comparison matrices)
CREATE TABLE IF NOT EXISTS public.literature_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_ids UUID[] NOT NULL,
    comparison_matrix JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Research Gap Reports
CREATE TABLE IF NOT EXISTS public.research_gap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_ids UUID[] NOT NULL,
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Saved Academic Papers (from Semantic Scholar & arXiv)
CREATE TABLE IF NOT EXISTS public.saved_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK (source IN ('semantic_scholar', 'arxiv')),
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    authors TEXT[] NOT NULL DEFAULT '{}',
    abstract TEXT,
    publication_year INTEGER,
    published_date TEXT,
    url TEXT NOT NULL,
    pdf_url TEXT,
    citation_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, source, external_id)
);

-- Indexes for fast tenant-scoped queries & FK lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_ws ON public.documents(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_ws ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_ws ON public.research_sessions(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_doc ON public.document_summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_summaries_ws ON public.document_summaries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lit_reviews_user_ws ON public.literature_reviews(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gap_reports_user_ws ON public.research_gap_reports(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_papers_user ON public.saved_papers(user_id, workspace_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_sessions_updated_at ON public.research_sessions;
CREATE TRIGGER set_sessions_updated_at BEFORE UPDATE ON public.research_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_summaries_updated_at ON public.document_summaries;
CREATE TRIGGER set_summaries_updated_at BEFORE UPDATE ON public.document_summaries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_gap_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_papers ENABLE ROW LEVEL SECURITY;

-- Explicit TO authenticated + (select auth.uid()) RLS policies
CREATE POLICY "Users manage own profile" ON public.profiles
    FOR ALL TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users manage own workspaces" ON public.workspaces
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own documents" ON public.documents
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own sessions" ON public.research_sessions
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own messages" ON public.chat_messages
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own summaries" ON public.document_summaries
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own literature reviews" ON public.literature_reviews
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own gap reports" ON public.research_gap_reports
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users manage own saved papers" ON public.saved_papers
    FOR ALL TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- Private Storage Bucket & Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-papers', 'research-papers', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own PDFs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'research-papers'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );

CREATE POLICY "Users read own PDFs" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'research-papers'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );

CREATE POLICY "Users update own PDFs" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'research-papers'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    )
    WITH CHECK (
        bucket_id = 'research-papers'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );

CREATE POLICY "Users delete own PDFs" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'research-papers'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Database,
  FileSearch,
  FileText,
  Layers,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: FileSearch,
    title: "True 12-Step RAG Citations",
    description:
      "Every answer retrieves relevant PDF chunks via ChromaDB and cites the exact paper title and page number — never fabricated references.",
  },
  {
    icon: FileText,
    title: "Structured Paper Summariser",
    description:
      "Extract problem statements, objectives, methodology, datasets, algorithms, experimental results, limitations, and future scope in one click.",
  },
  {
    icon: Table2,
    title: "Literature Review Matrix",
    description:
      "Compare multiple uploaded papers side-by-side across methodology, datasets, results, and limitations, then export to PDF or CSV.",
  },
  {
    icon: Sparkles,
    title: "Research Gap Identification",
    description:
      "Synthesize cross-paper limitations and separate evidence-backed research gaps from AI-suggested future directions.",
  },
  {
    icon: Compass,
    title: "Semantic Scholar & arXiv Discovery",
    description:
      "Search millions of peer-reviewed papers and preprints directly from your workspace, filter by year, and save key citations.",
  },
  {
    icon: Layers,
    title: "Isolated Research Workspaces",
    description:
      "Organize papers, chat sessions, summaries, and gap reports by thesis chapter or course project with strict per-user isolation.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Upload Research PDFs",
    detail:
      "Drag and drop academic papers into a workspace. PyMuPDF + OCR fallback extracts clean, page-numbered text.",
  },
  {
    step: "02",
    title: "Chunk, Embed & Index",
    detail:
      "LangChain splits text with overlap while preserving document and page metadata inside isolated ChromaDB collections.",
  },
  {
    step: "03",
    title: "Semantic Retrieval + Gemini",
    detail:
      "Your question embeds into vector space, retrieves top matching chunks, and instructs Gemini to answer strictly from evidence.",
  },
  {
    step: "04",
    title: "Compare, Spot Gaps & Export",
    detail:
      "Generate multi-paper literature matrices, gap reports, and formatted PDF/CSV exports for your thesis or publication.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              ResearchMate AI
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              How it Works
            </a>
            <a href="#architecture" className="hover:text-foreground">
              RAG & APIs
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 px-3 py-1 text-xs">
            Built with LangChain · ChromaDB · Google Gemini · Semantic Scholar · arXiv
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Read research papers faster with{" "}
            <span className="text-primary">evidence-grounded AI</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            ResearchMate AI is an intelligent academic research assistant for students,
            researchers, and scholars. Upload PDFs, ask citation-backed questions, build
            literature review tables, uncover research gaps, and discover new papers in one
            calm workspace.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/register">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/login">Sign in to Workspace</Link>
            </Button>
          </div>
        </div>

        {/* Clean SaaS Product Preview Card */}
        <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Indexed Workspace Papers
              </div>
              <p className="mt-2 text-sm font-semibold">Attention Is All You Need.pdf</p>
              <p className="mt-1 text-xs text-muted-foreground">
                15 pages · 42 semantic chunks · Ready
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="success">Verified RAG</Badge>
                <Badge variant="outline">Page-indexed</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <MessageSquareText className="h-3.5 w-3.5" />
                Grounded AI Response with Citations
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                The Transformer replaces recurrence entirely with multi-head self-attention,
                reducing sequential operations to O(1) and enabling parallel training across
                sequence tokens.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  Source: Attention Is All You Need · Page 3
                </span>
                <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  Source: Attention Is All You Need · Page 5
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="border-t border-border bg-card/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need for rigorous academic research
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Purpose-built tools that go far beyond a generic chatbot.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <Card key={feat.title} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle>{feat.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How the RAG pipeline works
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Transparent Retrieval-Augmented Generation from PDF upload to verified citation.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <span className="font-mono text-xs font-semibold text-primary">
                  STEP {item.step}
                </span>
                <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RAG, LLM & API Capabilities */}
      <section
        id="architecture"
        className="border-t border-border bg-card/40 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Database className="mb-2 h-5 w-5 text-primary" />
                <CardTitle>Vector Search & Isolation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                LangChain + ChromaDB index chunk embeddings tagged with user ID, workspace
                ID, document title, and page numbers for strict tenant privacy.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Sparkles className="mb-2 h-5 w-5 text-primary" />
                <CardTitle>Google Gemini Synthesis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Context-bounded prompts generate grounded Q&A, 9-part paper summaries,
                literature matrices, and gap analyses with clear abstention when evidence is
                missing.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                <CardTitle>Live Academic APIs & Security</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Real-time Semantic Scholar and arXiv search routed through FastAPI, backed
                by Supabase Auth, private PDF storage, and PostgreSQL Row Level Security.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>ResearchMate AI</span>
          </div>
          <p>
            Intelligent Academic Research Assistant · Powered by FastAPI, LangChain,
            ChromaDB, Supabase & Gemini
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">
              Login
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

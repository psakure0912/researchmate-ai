"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  FileText,
  FolderPlus,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import type { ResearchDocument, ResearchSession, Workspace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userName, setUserName] = React.useState("Researcher");
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [documents, setDocuments] = React.useState<ResearchDocument[]>([]);
  const [sessions, setSessions] = React.useState<ResearchSession[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadDashboard = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserName(
            (user.user_metadata?.full_name as string) ||
              user.email?.split("@")[0] ||
              "Researcher"
          );
        }

        const [wsData, docsData, sessionsData] = await Promise.all([
          apiRequest<Workspace[]>("/api/v1/workspaces").catch(() => []),
          apiRequest<ResearchDocument[]>("/api/v1/documents").catch(() => []),
          apiRequest<ResearchSession[]>("/api/v1/chat/sessions").catch(() => []),
        ]);

        setWorkspaces(wsData);
        setDocuments(docsData);
        setSessions(sessionsData);
      } catch (err) {
        toast({
          kind: "error",
          title: "Could not load dashboard",
          description: err instanceof Error ? err.message : "Backend unavailable.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [toast]);

  const filteredDocs = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return documents.slice(0, 5);
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.file_name.toLowerCase().includes(q) ||
        (d.authors || "").toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const handleQuickDiscovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your research workspaces, papers, RAG sessions, and literature reviews.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/workspaces">
              <FolderPlus className="h-4 w-4" />
              New Workspace
            </Link>
          </Button>
          <Button asChild>
            <Link href="/documents">
              <Upload className="h-4 w-4" />
              Upload PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleQuickDiscovery} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter your uploaded papers or press Enter to search Semantic Scholar & arXiv..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search Academic APIs
        </Button>
      </form>

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Uploaded Papers</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : documents.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Indexed in isolated ChromaDB vector collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Research Sessions</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : sessions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Grounded RAG Q&amp;A threads with page citations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Workspaces</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : workspaces.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Organized projects &amp; thesis folders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/chat"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">AI Research Chat</p>
            <p className="text-xs text-muted-foreground">Ask cited questions</p>
          </div>
        </Link>

        <Link
          href="/literature-review"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Table2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Literature Review</p>
            <p className="text-xs text-muted-foreground">Compare multiple papers</p>
          </div>
        </Link>

        <Link
          href="/gap-analysis"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Research Gaps</p>
            <p className="text-xs text-muted-foreground">Spot future directions</p>
          </div>
        </Link>

        <Link
          href="/discover"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Discover Papers</p>
            <p className="text-xs text-muted-foreground">Semantic Scholar &amp; arXiv</p>
          </div>
        </Link>
      </div>

      {/* Recent Documents & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recently Uploaded Documents</CardTitle>
              <CardDescription>PDFs processed and ready for RAG retrieval</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/documents">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No papers uploaded yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a PDF to start extracting text, embeddings, and summaries.
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/documents">
                    <Plus className="h-3.5 w-3.5" /> Upload PDF
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.page_count} pages · {formatBytes(doc.file_size_bytes)} ·{" "}
                        {formatRelativeDate(doc.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        doc.processing_status === "ready"
                          ? "success"
                          : doc.processing_status === "failed"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {doc.processing_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Research Activity</CardTitle>
              <CardDescription>Resume your latest AI chat sessions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chat">Open chat</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No research sessions yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start an AI conversation inside a workspace with uploaded papers.
                </p>
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/chat">Start a session</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/chat?sessionId=${session.id}&workspaceId=${session.workspace_id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatRelativeDate(session.updated_at)}
                      </p>
                    </div>
                    <Badge variant="outline">Open</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

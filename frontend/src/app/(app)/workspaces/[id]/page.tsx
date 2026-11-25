"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  FileText,
  MessageSquare,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import type {
  LiteratureReview,
  ResearchDocument,
  ResearchGapReport,
  ResearchSession,
  SavedPaper,
  Workspace,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;
  const { toast } = useToast();

  const [workspace, setWorkspace] = React.useState<Workspace | null>(null);
  const [documents, setDocuments] = React.useState<ResearchDocument[]>([]);
  const [sessions, setSessions] = React.useState<ResearchSession[]>([]);
  const [reviews, setReviews] = React.useState<LiteratureReview[]>([]);
  const [gapReports, setGapReports] = React.useState<ResearchGapReport[]>([]);
  const [savedPapers, setSavedPapers] = React.useState<SavedPaper[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [ws, docs, sess, rev, gaps, saved] = await Promise.all([
          apiRequest<Workspace>(`/api/v1/workspaces/${workspaceId}`),
          apiRequest<ResearchDocument[]>(`/api/v1/documents?workspace_id=${workspaceId}`).catch(() => []),
          apiRequest<ResearchSession[]>(`/api/v1/chat/sessions?workspace_id=${workspaceId}`).catch(() => []),
          apiRequest<LiteratureReview[]>(`/api/v1/literature-review?workspace_id=${workspaceId}`).catch(() => []),
          apiRequest<ResearchGapReport[]>(`/api/v1/gap-analysis?workspace_id=${workspaceId}`).catch(() => []),
          apiRequest<SavedPaper[]>(`/api/v1/discover/saved?workspace_id=${workspaceId}`).catch(() => []),
        ]);
        setWorkspace(ws);
        setDocuments(docs);
        setSessions(sess);
        setReviews(rev);
        setGapReports(gaps);
        setSavedPapers(saved);
      } catch (err) {
        toast({
          kind: "error",
          title: "Could not load workspace",
          description: err instanceof Error ? err.message : "Error loading data.",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId, toast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/workspaces"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to workspaces
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {workspace?.name || "Workspace"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace?.description || "Organize papers, RAG conversations, reviews, and gap reports."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/documents?workspaceId=${workspaceId}`}>
              <Upload className="h-4 w-4" /> Upload PDF
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/chat?workspaceId=${workspaceId}`}>
              <MessageSquare className="h-4 w-4" /> Ask AI
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="documents">
        <TabsList className="flex-wrap">
          <TabsTrigger value="documents">Papers ({documents.length})</TabsTrigger>
          <TabsTrigger value="chats">Chats ({sessions.length})</TabsTrigger>
          <TabsTrigger value="reviews">Literature Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="gaps">Gap Reports ({gapReports.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved Discovery ({savedPapers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-3">
          {documents.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No papers in this workspace</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href={`/documents?workspaceId=${workspaceId}`}>Upload first PDF</Link>
              </Button>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-sm">{doc.title}</CardTitle>
                    <CardDescription>
                      {doc.page_count} pages · {doc.chunk_count} chunks · {formatBytes(doc.file_size_bytes)}
                    </CardDescription>
                  </div>
                  <Badge variant={doc.processing_status === "ready" ? "success" : "warning"}>
                    {doc.processing_status}
                  </Badge>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="chats" className="space-y-3">
          {sessions.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No chat sessions yet</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href={`/chat?workspaceId=${workspaceId}`}>Start AI Chat</Link>
              </Button>
            </Card>
          ) : (
            sessions.map((s) => (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-sm">{s.title}</CardTitle>
                    <CardDescription>Updated {formatRelativeDate(s.updated_at)}</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/chat?workspaceId=${workspaceId}&sessionId=${s.id}`}>Resume</Link>
                  </Button>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3">
          {reviews.length === 0 ? (
            <Card className="p-8 text-center">
              <Table2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No literature reviews generated</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href={`/literature-review?workspaceId=${workspaceId}`}>Generate Matrix</Link>
              </Button>
            </Card>
          ) : (
            reviews.map((rev) => (
              <Card key={rev.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-sm">{rev.title}</CardTitle>
                    <CardDescription>
                      {rev.comparison_matrix.length} papers compared · {formatRelativeDate(rev.created_at)}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/literature-review?workspaceId=${workspaceId}`}>View</Link>
                  </Button>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="gaps" className="space-y-3">
          {gapReports.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No research gap reports yet</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href={`/gap-analysis?workspaceId=${workspaceId}`}>Run Gap Analysis</Link>
              </Button>
            </Card>
          ) : (
            gapReports.map((rep) => (
              <Card key={rep.id}>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-sm">{rep.title}</CardTitle>
                    <CardDescription>
                      {rep.document_ids.length} papers analyzed · {formatRelativeDate(rep.created_at)}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/gap-analysis?workspaceId=${workspaceId}`}>View</Link>
                  </Button>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-3">
          {savedPapers.length === 0 ? (
            <Card className="p-8 text-center">
              <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No saved discovery papers</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/discover">Search Semantic Scholar &amp; arXiv</Link>
              </Button>
            </Card>
          ) : (
            savedPapers.map((paper) => (
              <Card key={paper.id}>
                <CardHeader className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">{paper.title}</CardTitle>
                      <CardDescription>
                        {paper.authors.slice(0, 3).join(", ")} {paper.publication_year ? `(${paper.publication_year})` : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{paper.source}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open original paper &rarr;
                  </a>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

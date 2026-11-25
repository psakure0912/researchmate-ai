"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { apiDownload, apiRequest } from "@/lib/api";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import type { ResearchDocument, StructuredSummary, Workspace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

const MAX_MB = 25;

function DocumentsContent() {
  const searchParams = useSearchParams();
  const initialWs = searchParams.get("workspaceId") || "";
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = React.useState(initialWs);
  const [documents, setDocuments] = React.useState<ResearchDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [activeSummary, setActiveSummary] = React.useState<StructuredSummary | null>(null);
  const [activeDoc, setActiveDoc] = React.useState<ResearchDocument | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      const [wsData, docsData] = await Promise.all([
        apiRequest<Workspace[]>("/api/v1/workspaces").catch(() => []),
        apiRequest<ResearchDocument[]>(
          selectedWorkspaceId
            ? `/api/v1/documents?workspace_id=${selectedWorkspaceId}`
            : "/api/v1/documents"
        ).catch(() => []),
      ]);
      setWorkspaces(wsData);
      if (!selectedWorkspaceId && wsData.length > 0) {
        setSelectedWorkspaceId(wsData[0].id);
      }
      setDocuments(docsData);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const validateAndUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedWorkspaceId) {
      toast({
        kind: "error",
        title: "Select a workspace first",
        description: "Create or pick a workspace before uploading a PDF.",
      });
      return;
    }

    const file = files[0];
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast({
        kind: "error",
        title: "Invalid file type",
        description: "Only PDF research papers are supported.",
      });
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      toast({
        kind: "error",
        title: "File too large",
        description: `Maximum file size is ${MAX_MB} MB.`,
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspace_id", selectedWorkspaceId);

      const created = await apiRequest<ResearchDocument>("/api/v1/documents/upload", {
        method: "POST",
        body: formData,
      });

      setDocuments((prev) => [created, ...prev]);
      toast({
        kind: "success",
        title: "Paper uploaded & indexed",
        description: `${created.title} (${created.page_count} pages, ${created.chunk_count} chunks)`,
      });
    } catch (err) {
      toast({
        kind: "error",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not process PDF.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: ResearchDocument) => {
    try {
      const res = await apiRequest<{ url: string }>(`/api/v1/documents/${doc.id}/download`);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        kind: "error",
        title: "Download unavailable",
        description: err instanceof Error ? err.message : "Could not fetch signed URL.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/v1/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast({ kind: "success", title: "Document deleted" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete document.",
      });
    }
  };

  const handleSummarize = async (doc: ResearchDocument) => {
    setActiveDoc(doc);
    setActiveSummary(null);
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      const summary = await apiRequest<StructuredSummary>(
        `/api/v1/summaries/${doc.id}`,
        { method: "POST" }
      );
      setActiveSummary(summary);
    } catch (err) {
      toast({
        kind: "error",
        title: "Summarisation failed",
        description: err instanceof Error ? err.message : "Could not generate summary.",
      });
      setSummaryOpen(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  const copySummaryText = () => {
    if (!activeSummary || !activeDoc) return;
    const text = [
      `# ${activeDoc.title}`,
      `\n## Abstract Summary\n${activeSummary.abstract_summary}`,
      `\n## Problem Statement\n${activeSummary.problem_statement}`,
      `\n## Research Objectives\n- ${activeSummary.research_objectives.join("\n- ")}`,
      `\n## Proposed Methodology\n${activeSummary.proposed_methodology}`,
      `\n## Dataset\n${activeSummary.dataset}`,
      `\n## Algorithms Used\n- ${activeSummary.algorithms_used.join("\n- ")}`,
      `\n## Experimental Results\n${activeSummary.experimental_results}`,
      `\n## Limitations\n- ${activeSummary.limitations.join("\n- ")}`,
      `\n## Future Scope\n- ${activeSummary.future_scope.join("\n- ")}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast({ kind: "success", title: "Summary copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload research PDFs to extract text, generate vector embeddings, and summarize papers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ws-select" className="text-xs font-medium text-muted-foreground">
            Workspace:
          </label>
          <select
            id="ws-select"
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop PDF Uploader */}
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          validateAndUpload(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => validateAndUpload(e.target.files)}
        />
        <UploadCloud className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 text-sm font-semibold">
          {uploading ? "Processing PDF & Indexing Embeddings..." : "Drag and drop a PDF paper here"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports text and scanned PDFs (with OCR fallback) up to {MAX_MB} MB.
        </p>
        <Button
          type="button"
          className="mt-4"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          Select PDF File
        </Button>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-9 w-9 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No documents found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a PDF above to start building your knowledge base.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="truncate text-base">{doc.title}</CardTitle>
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
                  <CardDescription>
                    {doc.file_name} · {doc.page_count} pages · {doc.chunk_count} chunks ·{" "}
                    {formatBytes(doc.file_size_bytes)} · {formatRelativeDate(doc.created_at)}
                  </CardDescription>
                  {doc.error_message && (
                    <p className="text-xs text-destructive">{doc.error_message}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={doc.processing_status !== "ready"}
                    onClick={() => handleSummarize(doc)}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Summarise
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Structured Paper Summary Modal */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeDoc?.title || "Paper Summary"}</DialogTitle>
            <DialogDescription>
              Structured academic synthesis generated from extracted document sections.
            </DialogDescription>
          </DialogHeader>

          {summaryLoading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Generating structured summary with Google Gemini...
              </p>
            </div>
          ) : activeSummary ? (
            <div className="space-y-4 text-sm">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={copySummaryText}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                {activeDoc && (
                  <Button
                    size="sm"
                    onClick={() =>
                      apiDownload(
                        `/api/v1/exports/summary/${activeDoc.id}/pdf`,
                        `${activeDoc.title.slice(0, 40)}_summary.pdf`
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" /> Export PDF
                  </Button>
                )}
              </div>

              <Section title="Abstract Summary" body={activeSummary.abstract_summary} />
              <Section title="Problem Statement" body={activeSummary.problem_statement} />
              <ListSection title="Research Objectives" items={activeSummary.research_objectives} />
              <Section title="Proposed Methodology" body={activeSummary.proposed_methodology} />
              <Section title="Dataset" body={activeSummary.dataset} />
              <ListSection title="Algorithms Used" items={activeSummary.algorithms_used} />
              <Section title="Experimental Results" body={activeSummary.experimental_results} />
              <ListSection title="Limitations" items={activeSummary.limitations} />
              <ListSection title="Future Scope" items={activeSummary.future_scope} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</h4>
      <p className="mt-1.5 leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</h4>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-foreground">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <DocumentsContent />
    </React.Suspense>
  );
}

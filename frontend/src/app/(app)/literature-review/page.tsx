"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2, Table2 } from "lucide-react";
import { apiDownload, apiRequest } from "@/lib/api";
import type { LiteratureReview, ResearchDocument, Workspace } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

function LiteratureReviewContent() {
  const searchParams = useSearchParams();
  const initialWs = searchParams.get("workspaceId") || "";
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = React.useState(initialWs);
  const [documents, setDocuments] = React.useState<ResearchDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState("Literature Comparison Matrix");
  const [reviews, setReviews] = React.useState<LiteratureReview[]>([]);
  const [activeReview, setActiveReview] = React.useState<LiteratureReview | null>(null);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    apiRequest<Workspace[]>("/api/v1/workspaces")
      .then((ws) => {
        setWorkspaces(ws);
        if (!workspaceId && ws.length > 0) setWorkspaceId(ws[0].id);
      })
      .catch(() => {});
  }, [workspaceId]);

  React.useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      apiRequest<ResearchDocument[]>(`/api/v1/documents?workspace_id=${workspaceId}`).catch(() => []),
      apiRequest<LiteratureReview[]>(`/api/v1/literature-review?workspace_id=${workspaceId}`).catch(() => []),
    ]).then(([docs, revs]) => {
      setDocuments(docs.filter((d) => d.processing_status === "ready"));
      setReviews(revs);
      if (revs.length > 0) setActiveReview(revs[0]);
      setSelectedDocIds([]);
    });
  }, [workspaceId]);

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length < 2) {
      toast({
        kind: "error",
        title: "Select at least 2 papers",
        description: "Pick 2 or more ready PDFs to compare.",
      });
      return;
    }

    setGenerating(true);
    try {
      const created = await apiRequest<LiteratureReview>("/api/v1/literature-review/generate", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: title.trim() || "Literature Comparison Matrix",
          document_ids: selectedDocIds,
        }),
      });
      setReviews((prev) => [created, ...prev]);
      setActiveReview(created);
      toast({ kind: "success", title: "Literature review matrix generated" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Could not generate comparison.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Literature Review Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare multiple uploaded papers across objectives, methods, datasets, results, and gaps.
          </p>
        </div>

        <select
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>

      {/* Selector Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Papers to Compare</CardTitle>
          <CardDescription>Choose 2 or more indexed papers in this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Comparison title"
            />
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ready PDFs in this workspace yet. Upload papers in Document Library first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const checked = selectedDocIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDoc(doc.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="truncate font-medium">{doc.title}</span>
                  </label>
                );
              })}
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generating || selectedDocIds.length < 2}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Table2 className="h-4 w-4" />
            )}
            Generate Literature Comparison ({selectedDocIds.length} selected)
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Matrix */}
      {activeReview ? (
        <Card>
          <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>{activeReview.title}</CardTitle>
              <CardDescription>
                {activeReview.comparison_matrix.length} papers compared
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  apiDownload(
                    `/api/v1/exports/literature-review/${activeReview.id}/csv`,
                    `literature_review_${activeReview.id.slice(0, 8)}.csv`
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  apiDownload(
                    `/api/v1/exports/literature-review/${activeReview.id}/pdf`,
                    `literature_review_${activeReview.id.slice(0, 8)}.pdf`
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="p-3 font-semibold">Paper Title</th>
                    <th className="p-3 font-semibold">Year</th>
                    <th className="p-3 font-semibold">Objectives</th>
                    <th className="p-3 font-semibold">Methodology</th>
                    <th className="p-3 font-semibold">Dataset</th>
                    <th className="p-3 font-semibold">Algorithms</th>
                    <th className="p-3 font-semibold">Results</th>
                    <th className="p-3 font-semibold">Limitations</th>
                    <th className="p-3 font-semibold">Research Gaps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeReview.comparison_matrix.map((row) => (
                    <tr key={row.document_id} className="align-top hover:bg-muted/20">
                      <td className="p-3 font-medium text-foreground">{row.title}</td>
                      <td className="p-3">{row.publication_year}</td>
                      <td className="p-3">{row.research_objectives}</td>
                      <td className="p-3">{row.methodology}</td>
                      <td className="p-3">{row.dataset}</td>
                      <td className="p-3">{row.algorithms_or_techniques}</td>
                      <td className="p-3">{row.results}</td>
                      <td className="p-3">{row.limitations}</td>
                      <td className="p-3">{row.research_gaps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {reviews.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {reviews.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={activeReview?.id === r.id ? "default" : "outline"}
              onClick={() => setActiveReview(r)}
            >
              {r.title}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiteratureReviewPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <LiteratureReviewContent />
    </React.Suspense>
  );
}

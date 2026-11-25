"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, Lightbulb, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { apiDownload, apiRequest } from "@/lib/api";
import type { ResearchDocument, ResearchGapReport, Workspace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

function GapAnalysisContent() {
  const searchParams = useSearchParams();
  const initialWs = searchParams.get("workspaceId") || "";
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = React.useState(initialWs);
  const [documents, setDocuments] = React.useState<ResearchDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = React.useState<string[]>([]);
  const [title, setTitle] = React.useState("Cross-Paper Research Gap Analysis");
  const [reports, setReports] = React.useState<ResearchGapReport[]>([]);
  const [activeReport, setActiveReport] = React.useState<ResearchGapReport | null>(null);
  const [running, setRunning] = React.useState(false);

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
      apiRequest<ResearchGapReport[]>(`/api/v1/gap-analysis?workspace_id=${workspaceId}`).catch(() => []),
    ]).then(([docs, reps]) => {
      setDocuments(docs.filter((d) => d.processing_status === "ready"));
      setReports(reps);
      if (reps.length > 0) setActiveReport(reps[0]);
      setSelectedDocIds([]);
    });
  }, [workspaceId]);

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAnalyze = async () => {
    if (selectedDocIds.length < 2) {
      toast({
        kind: "error",
        title: "Select at least 2 papers",
        description: "Gap analysis works best across 2 or more research papers.",
      });
      return;
    }

    setRunning(true);
    try {
      const created = await apiRequest<ResearchGapReport>("/api/v1/gap-analysis/generate", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: title.trim() || "Cross-Paper Research Gap Analysis",
          document_ids: selectedDocIds,
        }),
      });
      setReports((prev) => [created, ...prev]);
      setActiveReport(created);
      toast({ kind: "success", title: "Research gap report ready" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Could not run gap analysis.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Research Gap Identification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Distinguish document-backed limitations from AI-suggested future research opportunities.
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

      <Card>
        <CardHeader>
          <CardTitle>Select Papers to Analyze</CardTitle>
          <CardDescription>Pick 2 or more indexed papers in your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Report title" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const checked = selectedDocIds.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm ${
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

          <Button onClick={handleAnalyze} disabled={running || selectedDocIds.length < 2}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Identify Research Gaps ({selectedDocIds.length} selected)
          </Button>
        </CardContent>
      </Card>

      {activeReport && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{activeReport.title}</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  apiDownload(
                    `/api/v1/exports/gap-report/${activeReport.id}/csv`,
                    `gap_report_${activeReport.id.slice(0, 8)}.csv`
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  apiDownload(
                    `/api/v1/exports/gap-report/${activeReport.id}/pdf`,
                    `gap_report_${activeReport.id.slice(0, 8)}.pdf`
                  )
                }
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <BulletCard title="Common Research Themes" items={activeReport.report_data.common_themes} />
            <BulletCard title="Existing Approaches" items={activeReport.report_data.existing_approaches} />
            <BulletCard
              title="Frequently Used Methodologies"
              items={activeReport.report_data.frequent_methodologies}
            />
            <BulletCard
              title="Shared Limitations Across Studies"
              items={activeReport.report_data.shared_limitations}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle>Evidence-Backed Research Gaps (From Uploaded Papers)</CardTitle>
              </div>
              <CardDescription>
                Underexplored areas directly evidenced by limitations or future work in your PDFs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeReport.report_data.evidence_backed_gaps.map((gap, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-foreground">{gap.gap_title}</h4>
                    <Badge variant="success">Document-backed</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{gap.description}</p>
                  {gap.supporting_references?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {gap.supporting_references.map((ref, j) => (
                        <Badge key={j} variant="outline" className="font-mono text-[11px]">
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle>AI-Suggested Future Research Opportunities</CardTitle>
              </div>
              <CardDescription>
                Novel synthesis directions proposed by Gemini based on cross-study patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeReport.report_data.ai_suggested_opportunities.map((dir, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-foreground">{dir.direction_title}</h4>
                    <Badge variant="warning">AI-suggested</Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{dir.rationale}</p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    Potential Impact: {dir.potential_impact}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {reports.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {reports.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={activeReport?.id === r.id ? "default" : "outline"}
              onClick={() => setActiveReport(r)}
            >
              {r.title}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function GapAnalysisPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <GapAnalysisContent />
    </React.Suspense>
  );
}

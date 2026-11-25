"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  Compass,
  ExternalLink,
  FileDown,
  Loader2,
  Search,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { AcademicPaperResult, SavedPaper, Workspace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { toast } = useToast();

  const [query, setQuery] = React.useState(initialQuery);
  const [source, setSource] = React.useState<"both" | "semantic_scholar" | "arxiv">("both");
  const [yearFrom, setYearFrom] = React.useState("");
  const [results, setResults] = React.useState<AcademicPaperResult[]>([]);
  const [savedPapers, setSavedPapers] = React.useState<SavedPaper[]>([]);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [saveWorkspaceId, setSaveWorkspaceId] = React.useState("");
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      apiRequest<Workspace[]>("/api/v1/workspaces").catch(() => []),
      apiRequest<SavedPaper[]>("/api/v1/discover/saved").catch(() => []),
    ]).then(([ws, saved]) => {
      setWorkspaces(ws);
      if (ws.length > 0) setSaveWorkspaceId(ws[0].id);
      setSavedPapers(saved);
    });
  }, []);

  const runSearch = React.useCallback(
    async (qText: string) => {
      if (!qText.trim()) return;
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: qText.trim(),
          source,
          limit: "12",
        });
        if (yearFrom.trim()) params.set("year_from", yearFrom.trim());

        const data = await apiRequest<{ results: AcademicPaperResult[] }>(
          `/api/v1/discover/search?${params.toString()}`
        );
        setResults(data.results);
      } catch (err) {
        toast({
          kind: "error",
          title: "Academic search failed",
          description: err instanceof Error ? err.message : "Could not reach academic APIs.",
        });
      } finally {
        setSearching(false);
      }
    },
    [source, yearFrom, toast]
  );

  React.useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  const handleSave = async (paper: AcademicPaperResult) => {
    try {
      const saved = await apiRequest<SavedPaper>("/api/v1/discover/save", {
        method: "POST",
        body: JSON.stringify({
          ...paper,
          workspace_id: saveWorkspaceId || null,
        }),
      });
      setSavedPapers((prev) => [
        saved,
        ...prev.filter((p) => !(p.source === saved.source && p.external_id === saved.external_id)),
      ]);
      toast({ kind: "success", title: "Paper saved to library" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Could not save paper",
        description: err instanceof Error ? err.message : "Save failed.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Academic Research Discovery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search live publications from Semantic Scholar and arXiv preprints, filter by year, and save references.
        </p>
      </div>

      {/* Search Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-12"
      >
        <div className="relative sm:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Retrieval Augmented Generation survey"
            className="pl-9"
            required
          />
        </div>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value as "both" | "semantic_scholar" | "arxiv")}
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm sm:col-span-2"
        >
          <option value="both">Both APIs</option>
          <option value="semantic_scholar">Semantic Scholar</option>
          <option value="arxiv">arXiv</option>
        </select>

        <Input
          type="number"
          min={1950}
          max={2030}
          value={yearFrom}
          onChange={(e) => setYearFrom(e.target.value)}
          placeholder="Year from (e.g. 2022)"
          className="sm:col-span-2"
        />

        <Button type="submit" disabled={searching} className="sm:col-span-2">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      <Tabs defaultValue="results">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="results">Search Results ({results.length})</TabsTrigger>
            <TabsTrigger value="saved">Saved Papers ({savedPapers.length})</TabsTrigger>
          </TabsList>

          {workspaces.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Save to workspace:</span>
              <select
                value={saveWorkspaceId}
                onChange={(e) => setSaveWorkspaceId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <TabsContent value="results" className="space-y-3">
          {searching ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : results.length === 0 ? (
            <Card className="p-10 text-center">
              <Compass className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Search live academic databases</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter keywords above to query Semantic Scholar and arXiv in real time.
              </p>
            </Card>
          ) : (
            results.map((paper) => (
              <Card key={`${paper.source}-${paper.external_id}`}>
                <CardHeader>
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <CardTitle className="text-base">{paper.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {paper.authors.slice(0, 5).join(", ")}
                        {paper.authors.length > 5 ? " et al." : ""}
                        {paper.publication_year ? ` · ${paper.publication_year}` : ""}
                        {paper.citation_count !== null ? ` · ${paper.citation_count} citations` : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {paper.source === "semantic_scholar" ? "Semantic Scholar" : "arXiv"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {paper.abstract || "No abstract returned by source API."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleSave(paper)}>
                      <Bookmark className="h-3.5 w-3.5" /> Save Paper
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={paper.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Original Paper
                      </a>
                    </Button>
                    {paper.pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={paper.pdf_url} target="_blank" rel="noreferrer">
                          <FileDown className="h-3.5 w-3.5" /> Open PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-3">
          {savedPapers.length === 0 ? (
            <Card className="p-8 text-center">
              <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No saved papers yet</p>
            </Card>
          ) : (
            savedPapers.map((paper) => (
              <Card key={paper.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{paper.title}</CardTitle>
                      <CardDescription>
                        {paper.authors.slice(0, 4).join(", ")}
                        {paper.publication_year ? ` · ${paper.publication_year}` : ""}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{paper.source}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={paper.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> View Paper
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <DiscoverContent />
    </React.Suspense>
  );
}

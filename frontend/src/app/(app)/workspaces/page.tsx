"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FolderKanban, Loader2, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { formatRelativeDate } from "@/lib/utils";
import type { Workspace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export default function WorkspacesPage() {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tags, setTags] = React.useState("");

  const fetchWorkspaces = React.useCallback(async () => {
    try {
      const data = await apiRequest<Workspace[]>("/api/v1/workspaces");
      setWorkspaces(data);
    } catch (err) {
      toast({
        kind: "error",
        title: "Failed to load workspaces",
        description: err instanceof Error ? err.message : "Backend unavailable.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await apiRequest<Workspace>("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          topic_tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      setWorkspaces((prev) => [created, ...prev]);
      setName("");
      setDescription("");
      setTags("");
      setOpen(false);
      toast({ kind: "success", title: "Workspace created" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Could not create workspace",
        description: err instanceof Error ? err.message : "Error creating workspace.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/v1/workspaces/${id}`, { method: "DELETE" });
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      toast({ kind: "success", title: "Workspace deleted" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete workspace.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Research Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group uploaded PDFs, AI chats, summaries, reviews, and saved papers by project.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Research Workspace</DialogTitle>
              <DialogDescription>
                Each workspace keeps its documents, RAG retrieval context, and reports neatly separated.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g., Medical Image Segmentation Survey"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-desc">Description</Label>
                <Textarea
                  id="ws-desc"
                  placeholder="Scope, research question, or course details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws-tags">Topic tags (comma-separated)</Label>
                <Input
                  id="ws-tags"
                  placeholder="Transformers, Healthcare AI, RAG"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-base font-semibold">No workspaces yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first workspace to upload research papers and start asking questions.
          </p>
          <Button className="mt-5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Create your first workspace
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="flex flex-col justify-between transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1">{ws.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(ws.id)}
                    aria-label="Delete workspace"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardDescription className="line-clamp-2">
                  {ws.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {ws.topic_tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>Updated {formatRelativeDate(ws.updated_at)}</span>
                  <Link
                    href={`/workspaces/${ws.id}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

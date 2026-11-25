"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { ChatMessage, ResearchDocument, ResearchSession, Workspace } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const QUICK_PROMPTS = [
  "Summarise the key contributions of these papers.",
  "Explain the main technical concept in simple language.",
  "What are the research objectives, datasets, and algorithms used?",
  "What experimental results, limitations, and future scope are reported?",
];

function ChatContent() {
  const searchParams = useSearchParams();
  const initialWs = searchParams.get("workspaceId") || "";
  const initialSession = searchParams.get("sessionId") || "";
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = React.useState(initialWs);
  const [documents, setDocuments] = React.useState<ResearchDocument[]>([]);
  const [sessions, setSessions] = React.useState<ResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState(initialSession);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const init = async () => {
      try {
        const ws = await apiRequest<Workspace[]>("/api/v1/workspaces").catch(() => []);
        setWorkspaces(ws);
        if (!workspaceId && ws.length > 0) {
          setWorkspaceId(ws[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [workspaceId]);

  React.useEffect(() => {
    if (!workspaceId) return;
    const loadWorkspaceContext = async () => {
      const [docs, sess] = await Promise.all([
        apiRequest<ResearchDocument[]>(`/api/v1/documents?workspace_id=${workspaceId}`).catch(() => []),
        apiRequest<ResearchSession[]>(`/api/v1/chat/sessions?workspace_id=${workspaceId}`).catch(() => []),
      ]);
      setDocuments(docs.filter((d) => d.processing_status === "ready"));
      setSessions(sess);
      if (sess.length > 0 && !sess.some((s) => s.id === activeSessionId)) {
        setActiveSessionId(sess[0].id);
      } else if (sess.length === 0) {
        setActiveSessionId("");
        setMessages([]);
      }
    };
    loadWorkspaceContext();
  }, [workspaceId, activeSessionId]);

  React.useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    apiRequest<ChatMessage[]>(`/api/v1/chat/sessions/${activeSessionId}/messages`)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [activeSessionId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const createNewSession = async () => {
    if (!workspaceId) return;
    try {
      const created = await apiRequest<ResearchSession>("/api/v1/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, title: "New Research Session" }),
      });
      setSessions((prev) => [created, ...prev]);
      setActiveSessionId(created.id);
      setMessages([]);
    } catch (err) {
      toast({
        kind: "error",
        title: "Could not start session",
        description: err instanceof Error ? err.message : "Error creating session.",
      });
    }
  };

  const sendMessage = async (questionText?: string) => {
    const query = (questionText ?? input).trim();
    if (!query || !workspaceId) return;

    let sessionId = activeSessionId;
    setSending(true);
    if (!questionText) setInput("");

    try {
      if (!sessionId) {
        const created = await apiRequest<ResearchSession>("/api/v1/chat/sessions", {
          method: "POST",
          body: JSON.stringify({
            workspace_id: workspaceId,
            title: query.slice(0, 60),
          }),
        });
        sessionId = created.id;
        setSessions((prev) => [created, ...prev]);
        setActiveSessionId(created.id);
      }

      const optimisticUser: ChatMessage = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        role: "user",
        content: query,
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);

      const assistantMsg = await apiRequest<ChatMessage>(
        `/api/v1/chat/sessions/${sessionId}/ask`,
        {
          method: "POST",
          body: JSON.stringify({ question: query }),
        }
      );

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast({
        kind: "error",
        title: "RAG request failed",
        description: err instanceof Error ? err.message : "Could not get AI response.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      {/* Sessions Sidebar */}
      <Card className="flex w-full shrink-0 flex-col p-3 lg:w-72">
        <div className="mb-3 space-y-2">
          <label htmlFor="chat-ws" className="text-xs font-medium text-muted-foreground">
            Workspace
          </label>
          <select
            id="chat-ws"
            value={workspaceId}
            onChange={(e) => {
              setWorkspaceId(e.target.value);
              setActiveSessionId("");
            }}
            className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm"
          >
            {workspaces.length === 0 && <option value="">No workspaces</option>}
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={createNewSession}
            disabled={!workspaceId}
          >
            <MessageSquarePlus className="h-4 w-4" /> New Research Session
          </Button>
        </div>

        <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase text-muted-foreground">
          <span>Conversations</span>
          <span>{documents.length} indexed PDFs</span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSessionId(s.id)}
              className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                s.id === activeSessionId
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <p className="truncate">{s.title}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Main Chat Pane */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Ask your uploaded papers</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Questions trigger semantic chunk retrieval across your {documents.length} ready
                PDF(s) in this workspace and return page-level citations.
              </p>
              <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={!workspaceId || sending}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/40 text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {msg.role === "assistant" && msg.citations?.length > 0 && (
                    <div className="mt-3 border-t border-border/70 pt-2.5">
                      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <BookOpen className="h-3 w-3 text-primary" /> Sources Retrieved
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono text-[11px]">
                            {c.document_title} · p.{c.page_number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Retrieving relevant chunks and generating cited response...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="border-t border-border p-3 sm:p-4"
        >
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                workspaceId
                  ? "Ask about methodologies, datasets, results, or request a simple explanation..."
                  : "Create a workspace and upload PDFs first..."
              }
              disabled={!workspaceId || sending}
              className="min-h-[48px] resize-none"
            />
            <Button type="submit" disabled={!workspaceId || !input.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ChatContent />
    </React.Suspense>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Save } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [researchField, setResearchField] = React.useState("");
  const [summaryStyle, setSummaryStyle] = React.useState<"concise" | "detailed">("detailed");

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await apiRequest<Profile>("/api/v1/profile");
        setEmail(profile.email);
        setFullName(profile.full_name || "");
        setInstitution(profile.institution || "");
        setResearchField(profile.research_field || "");
        setSummaryStyle(profile.preferences?.default_summary_style || "detailed");
      } catch {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || "");
          setFullName((user.user_metadata?.full_name as string) || "");
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest<Profile>("/api/v1/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName.trim(),
          institution: institution.trim() || null,
          research_field: researchField.trim() || null,
          preferences: { default_summary_style: summaryStyle },
        }),
      });
      toast({ kind: "success", title: "Settings updated" });
    } catch (err) {
      toast({
        kind: "error",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account &amp; Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your academic profile, summary preferences, and session security.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Researcher Profile</CardTitle>
            <CardDescription>Used to personalize summaries and workspace metadata.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="institution">University / Institution</Label>
                <Input
                  id="institution"
                  placeholder="e.g., IIT Bombay"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="field">Primary Research Field</Label>
                <Input
                  id="field"
                  placeholder="e.g., Natural Language Processing"
                  value={researchField}
                  onChange={(e) => setResearchField(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="style">Default Summary Depth</Label>
                <select
                  id="style"
                  value={summaryStyle}
                  onChange={(e) =>
                    setSummaryStyle(e.target.value as "concise" | "detailed")
                  }
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  <option value="detailed">Detailed academic breakdown</option>
                  <option value="concise">Concise executive overview</option>
                </select>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of ResearchMate AI on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

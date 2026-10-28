import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Agency sign in — Athlete Mannies Family Vault" },
      {
        name: "description",
        content: "Sign in to manage Athlete Mannies Family Vaults, documents and membership tiers.",
      },
      { property: "og:title", content: "Agency sign in — Athlete Mannies Family Vault" },
      { property: "og:description", content: "Private sign in for the Athlete Mannies team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "setup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        setSent(true);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-7">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to home page
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Athlete Mannies &amp; Nannies
        </p>
        <h1 className="heading-display mt-2 text-2xl text-primary">Agency sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "setup"
            ? "First time here? Use the email your agency was invited with and choose a password. We'll email you a link to confirm it's you."
            : "Private area for Athlete Mannies and invited partner agency staff."}
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm">
            <p className="font-medium text-foreground">Check your email</p>
            <p className="mt-1 text-muted-foreground">
              We've sent a confirmation link to {email}. Open it on this device, then sign in with your new password.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => { setSent(false); setMode("signin"); }}>
              Back to sign in
            </Button>
          </div>
        ) : (
        <>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete={mode === "setup" ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "setup" ? "Set password" : "Sign in"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "setup" ? "signin" : "setup")}
          className="mt-4 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {mode === "setup" ? "Already set a password? Sign in" : "Invited partner staff? Set up your password"}
        </button>
        </>
        )}
      </div>
    </div>
  );
}

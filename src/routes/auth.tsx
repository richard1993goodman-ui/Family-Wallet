import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useServerFn } from "@tanstack/react-start";
import { requestStaffSetup } from "@/lib/staff-setup.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Agency sign in — The Family Wallet" },
      {
        name: "description",
        content: "Sign in to manage Family Wallets, documents and nanny tools.",
      },
      { property: "og:title", content: "Agency sign in — The Family Wallet" },
      { property: "og:description", content: "Private sign in for your agency team." },
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
  const [mode, setMode] = useState<"signin" | "setup" | "reset">("signin");
  const [sent, setSent] = useState(false);

  const [twoStep, setTwoStep] = useState<
    null | { kind: "verify"; factorId: string } | { kind: "enroll"; factorId: string; qr: string; secret: string }
  >(null);
  const [code, setCode] = useState("");
  const [choosePassword, setChoosePassword] = useState(false);
  const [resetFactorId, setResetFactorId] = useState<string | null>(null);
  const requestSetupFn = useServerFn(requestStaffSetup);

  async function onChoosePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Accounts with two-step must confirm a code before the password can change.
      if (resetFactorId) {
        const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({ factorId: resetFactorId, code: code.trim() });
        if (mfaError) throw new Error("That code didn't work. Check your authenticator app and try again.");
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setChoosePassword(false);
      setCode("");
      window.history.replaceState(null, "", "/auth");
      await continueTwoStep();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function continueTwoStep() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      navigate({ to: "/admin", replace: true });
      return;
    }
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    const verified = factors?.totp?.find((f) => f.status === "verified");
    if (verified) {
      setTwoStep({ kind: "verify", factorId: verified.id });
      return;
    }
    // Clear half-finished setups before starting a fresh one.
    for (const f of factors?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${Date.now()}`,
    });
    if (enrollError) throw enrollError;
    setTwoStep({ kind: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && new URLSearchParams(window.location.search).get("setup") === "1") {
        setChoosePassword(true);
        supabase.auth.mfa.listFactors().then(({ data: f }) => {
          const verified = f?.totp?.find((x) => x.status === "verified");
          if (verified) setResetFactorId(verified.id);
        });
        return;
      }
      if (data.session) continueTwoStep().catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!twoStep) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: twoStep.factorId, code: code.trim() });
      if (error) throw new Error("That code didn't work. Check your authenticator app and try again.");
      navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function cancelTwoStep() {
    await supabase.auth.signOut();
    setTwoStep(null);
    setCode("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode !== "signin") {
        await requestSetupFn({ data: { email, origin: window.location.origin } });
        setSent(true);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await continueTwoStep();
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
          The Family Wallet
        </p>
        <h1 className="heading-display mt-2 text-2xl text-primary">Agency sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "reset"
            ? "Forgot your password? Enter the email your agency added for you and we'll send a secure link to choose a new one."
            : mode === "setup"
            ? "First time here? Enter the email your agency added for you. We'll email you a secure link to choose your password."
            : "Private area for your agency and invited partner agency staff."}
        </p>

        {choosePassword ? (
          <form onSubmit={onChoosePassword} className="mt-6 space-y-4">
            <p className="font-medium text-foreground">Choose a new password</p>
            <div>
              <Label htmlFor="newpw">New password</Label>
              <Input id="newpw" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            {resetFactorId && (
              <div>
                <Label htmlFor="resetcode">6-digit code from your authenticator app</Label>
                <Input id="resetcode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} className="mt-1" />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</Button>
          </form>
        ) : twoStep ? (
          <form onSubmit={onVerify} className="mt-6 space-y-4">
            <p className="font-medium text-foreground">Two-step verification</p>
            {twoStep.kind === "enroll" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  One-time setup: scan this with an authenticator app (Google Authenticator, Microsoft Authenticator or
                  1Password), then enter the 6-digit code it shows.
                </p>
                <img src={twoStep.qr} alt="Authenticator setup QR code" className="mx-auto size-44 rounded-lg bg-card" />
                <p className="break-all text-center text-xs text-muted-foreground">
                  Can't scan? Enter this key: <span className="font-mono">{twoStep.secret}</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            )}
            <div>
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                className="mt-1 text-center font-mono text-lg tracking-[0.4em]"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Verify and continue"}
            </Button>
            <button type="button" onClick={cancelTwoStep} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
              Cancel and sign out
            </button>
          </form>
        ) : sent ? (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm">
            <p className="font-medium text-foreground">Check your email</p>
            <p className="mt-1 text-muted-foreground">
              If {email} is an invited partner email, a secure link is on its way. Open it, choose a password, then enter your authenticator code.
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
          {mode === "signin" && (<div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1"
            />
          </div>)}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "reset" ? "Email me a reset link" : mode === "setup" ? "Email me a setup link" : "Sign in"}
          </Button>
        </form>
        {mode === "signin" ? (
          <button type="button" onClick={() => setMode("reset")} className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Forgot password?
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "setup" : "signin")}
          className="mt-4 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {mode !== "signin" ? "Back to sign in" : "Invited partner staff? Set up your password"}
        </button>
        </>
        )}
      </div>
    </div>
  );
}

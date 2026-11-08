import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowRight, KeyRound, Link2, LockKeyhole } from "lucide-react";
import { unlockWallet } from "@/lib/wallet.functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function slugFromInput(input: string) {
  const trimmed = input.trim();
  // Accept a full wallet link or just the short name at the end.
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const parts = withoutProtocol.split(/[/?#]/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Which field the problem belongs to, so the message sits next to it. */
type LoginError = { field: "link" | "code" | "form"; message: string };

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 flex-none" />
      {message}
    </p>
  );
}

export function FamilyLogin({
  className,
  footer,
}: {
  className?: string;
  footer?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const unlockFn = useServerFn(unlockWallet);
  const [link, setLink] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const linkInvalid = error?.field === "link" || error?.field === "code";
  const codeInvalid = error?.field === "code";

  useEffect(() => {
    const saved = window.localStorage.getItem("wallet-link");
    if (saved) setLink(saved);
    else setRemember(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugFromInput(link);
    if (!slug) {
      setError({ field: "link", message: "Enter the wallet link your agency sent you." });
      linkInput.current?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (result.ok) {
        if (remember) window.localStorage.setItem("wallet-link", slug);
        else window.localStorage.removeItem("wallet-link");
        navigate({ to: "/w/$slug", params: { slug } });
      } else {
        if (result.reason === "rate_limited") {
          setError({
            field: "form",
            message: "Too many tries. Please wait 15 minutes and try again.",
          });
        } else {
          setError({
            field: "code",
            message: "That code doesn't match that link. Check both and try again.",
          });
          codeInput.current?.select();
        }
      }
    } catch {
      setError({
        field: "form",
        message: "Couldn't reach your wallet. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="sign-in" className={cn("scroll-mt-24 gap-5 rounded-lg", className)}>
      <CardHeader className="p-6 pb-5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LockKeyhole className="size-4 text-muted-foreground" /> Open your wallet
        </CardTitle>
        <CardDescription>The private link and code your agency sent you.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-5">
        <form id="family-login" onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wallet-link">Wallet Link</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={linkInput}
                id="wallet-link"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  if (error && error.field !== "form") setError(null);
                }}
                aria-invalid={linkInvalid || undefined}
                aria-describedby={error?.field === "link" ? "wallet-link-error" : undefined}
                placeholder="e.g. smith-4f2a"
                autoComplete="off"
                required
                className="h-10 pl-9"
              />
            </div>
            {error?.field === "link" && (
              <FieldError id="wallet-link-error" message={error.message} />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wallet-code">Access Code</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={codeInput}
                id="wallet-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (error && error.field !== "form") setError(null);
                }}
                aria-invalid={codeInvalid || undefined}
                aria-describedby={codeInvalid ? "wallet-code-error" : undefined}
                placeholder="6-character code"
                autoComplete="off"
                maxLength={8}
                required
                className="h-10 pl-9 font-mono uppercase tracking-[0.2em] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
              />
            </div>
            {codeInvalid && <FieldError id="wallet-code-error" message={error.message} />}
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="wallet-remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="wallet-remember"
              className="block text-sm font-normal leading-snug text-muted-foreground"
            >
              <span className="font-medium text-foreground">Remember this device</span> for 12
              months
            </Label>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3 px-6 pb-6">
        {error?.field === "form" && (
          <div className="w-full rounded-md bg-destructive/[0.07] px-3 py-2.5">
            <FieldError id="wallet-form-error" message={error.message} />
          </div>
        )}
        <Button type="submit" form="family-login" size="lg" className="h-10 w-full" disabled={busy}>
          {busy ? "Opening…" : "Open my wallet"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
        {footer}
      </CardFooter>
    </Card>
  );
}

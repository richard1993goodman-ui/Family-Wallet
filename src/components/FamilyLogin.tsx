import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, KeyRound } from "lucide-react";
import { unlockWallet } from "@/lib/wallet.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugFromInput(input: string) {
  const trimmed = input.trim();
  // Accept a full wallet link or just the short name at the end.
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const parts = withoutProtocol.split(/[/?#]/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function FamilyLogin() {
  const navigate = useNavigate();
  const unlockFn = useServerFn(unlockWallet);
  const [link, setLink] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("wallet-link");
    if (saved) setLink(saved);
    else setRemember(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugFromInput(link);
    if (!slug) {
      toast.error("Please enter your wallet link.");
      return;
    }
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (result.ok) {
        if (remember) window.localStorage.setItem("wallet-link", slug);
        else window.localStorage.removeItem("wallet-link");
        navigate({ to: "/w/$slug", params: { slug } });
      } else {
        toast.error(
          result.reason === "rate_limited"
            ? "Too many tries. Please wait 15 minutes and try again."
            : "That code doesn't match that link. Please check both and try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }


  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xl shadow-primary/5 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent" />
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/15">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Member access</p>
          <h2 className="heading-display text-xl text-foreground">Open your Family Wallet</h2>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Use the private link and access code sent to your family.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="wallet-link">Your wallet link</Label>
          <Input
            id="wallet-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="e.g. smith-4f2a"
            autoComplete="off"
            required
            className="mt-1.5 h-11 bg-background/70"
          />
        </div>
        <div>
          <Label htmlFor="wallet-code">Access code</Label>
          <Input
            id="wallet-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="6-character code"
            autoComplete="off"
            maxLength={8}
            required
            className="mt-1.5 h-11 bg-background/70 uppercase tracking-widest"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-foreground/90">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 size-4 accent-[hsl(var(--primary))]"
          />
          <span>
            Remember this device — stay signed in for 12 months and keep my wallet link saved here.
          </span>
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Opening…" : "Open my wallet"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
}

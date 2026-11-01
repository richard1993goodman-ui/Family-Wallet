import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, KeyRound, Link2, LockKeyhole } from "lucide-react";
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
    <Card
      id="sign-in"
      className={cn("scroll-mt-24 gap-5 rounded-2xl shadow-xl shadow-primary/5", className)}
    >
      <CardHeader>
        <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <LockKeyhole className="size-3.5" /> Member access
        </p>
        <CardTitle className="font-serif text-2xl font-semibold tracking-tight">
          Open your Family Wallet
        </CardTitle>
        <CardDescription>Use the private link and access code sent to your family.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="family-login" onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wallet-link">Your wallet link</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wallet-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="e.g. smith-4f2a"
                autoComplete="off"
                required
                className="h-11 pl-9"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wallet-code">Access code</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="wallet-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="6-character code"
                autoComplete="off"
                maxLength={8}
                required
                className="h-11 pl-9 uppercase tracking-widest"
              />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-muted/70 p-3">
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
              <span className="font-medium text-foreground">Remember this device</span> — stay
              signed in for 12 months and keep my wallet link saved here.
            </Label>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button type="submit" form="family-login" size="lg" className="h-11 w-full" disabled={busy}>
          {busy ? "Opening…" : "Open my wallet"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </Button>
        {footer}
      </CardFooter>
    </Card>
  );
}

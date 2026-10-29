import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { nannySignIn, nannyWalletName } from "@/lib/agreement.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/nanny/$slug")({
  head: () => ({
    meta: [
      { title: "Nanny sign in — The Family Wallet" },
      {
        name: "description",
        content:
          "Nannies sign in with their invitation code to read and sign the family's nanny agreement.",
      },
      { property: "og:title", content: "Nanny sign in — The Family Wallet" },
      {
        property: "og:description",
        content: "Read and sign the family's nanny agreement with your invitation code.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NannySignInPage,
});

function NannySignInPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const infoFn = useServerFn(nannyWalletName);
  const signInFn = useServerFn(nannySignIn);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const info = useQuery({
    queryKey: ["nanny-invite", slug],
    queryFn: () => infoFn({ data: { slug } }),
  });

  if (info.data?.unlocked) {
    void navigate({ to: "/w/$slug", params: { slug } });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await signInFn({ data: { slug, code } });
      if (result.ok) {
        await navigate({ to: "/w/$slug", params: { slug } });
      } else {
        toast.error(
          result.reason === "rate_limited"
            ? "Too many tries. Please wait 15 minutes and try again."
            : "That code doesn't match. Please check the invitation from the family.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7">
        <KeyRound className="h-6 w-6 text-primary" />
        <h1 className="heading-display mt-3 text-2xl leading-tight text-primary">Nanny sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {info.data?.familyName
            ? `You've been invited by the ${info.data.familyName} family to open your shared nanny workspace.`
            : "Enter the 6-character code the family sent you to open your shared nanny workspace."}
        </p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Your invitation code</span>
            <Input
              className="mt-1.5 uppercase tracking-[0.3em]"
              value={code}
              maxLength={8}
              placeholder="ABC123"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <Button type="submit" className="w-full" disabled={busy || code.trim().length < 4}>
            {busy ? "Checking…" : "Open my workspace"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          You can see daily care information and work tools. Private family membership details stay hidden.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { PageLoading } from "@/components/hub-ui";
import { FamilyDashboard } from "@/components/dashboard/FamilyDashboard";
import { NannyDashboard } from "@/components/dashboard/NannyDashboard";
import {
  getDocumentUrl,
  getWalletSummary,
  lockWalletFn,
  unlockWallet,
} from "@/lib/wallet.functions";
import { getHubSummary } from "@/lib/family.functions";
import { getNannies } from "@/lib/nannies.functions";
import { getAgreement } from "@/lib/agreement.functions";
import { signingRows } from "@/components/SigningProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/w/$slug")({
  head: () => ({
    meta: [
      { title: "Your Family Wallet" },
      {
        name: "description",
        content:
          "Your private Family Wallet: nanny agreement, nanny CV, messages, petty cash and everyday nanny tools.",
      },
      { property: "og:title", content: "Your Family Wallet" },
      {
        property: "og:description",
        content: "Your private Family Wallet for your family and nanny.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const summaryFn = useServerFn(getWalletSummary);
  const unlockFn = useServerFn(unlockWallet);
  const lockFn = useServerFn(lockWalletFn);
  const docFn = useServerFn(getDocumentUrl);
  const hubFn = useServerFn(getHubSummary);
  const agreementFn = useServerFn(getAgreement);
  const nanniesFn = useServerFn(getNannies);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ["wallet", slug],
    queryFn: () => summaryFn({ data: { slug } }),
  });

  const hubQuery = useQuery({
    queryKey: ["hub-summary", slug],
    queryFn: () => hubFn({ data: { slug } }),
  });
  const hub = hubQuery.data ?? null;

  const agreementQuery = useQuery({
    queryKey: ["agreement", slug],
    queryFn: () => agreementFn({ data: { slug } }),
  });
  const agreement = agreementQuery.data ?? null;

  const nanniesQuery = useQuery({
    queryKey: ["nannies", slug],
    queryFn: () => nanniesFn({ data: { slug } }),
  });
  const nannies = nanniesQuery.data?.nannies ?? [];
  const outstandingAgreements = nannies.filter((n) => !n.agreementSigned);
  const singleAgreementDone =
    agreement?.status === "issued" && signingRows(agreement.signatures, agreement.version).complete;
  const agreementDone =
    nannies.length > 0 ? outstandingAgreements.length === 0 : Boolean(singleAgreementDone);
  const agreementSubtitle =
    nannies.length > 1
      ? outstandingAgreements.length === 0
        ? `All ${nannies.length} agreements signed`
        : `${outstandingAgreements.length} of ${nannies.length} still to sign`
      : !agreement
        ? "Build it, then sign it here"
        : !agreement.hasContent
          ? "Not started — build it here"
          : agreement.status !== "issued"
            ? "Draft saved — finish and open for signing"
            : agreementDone
              ? "Signed by you and your nanny"
              : "Ready to sign — parent and nanny";

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await unlockFn({ data: { slug, code } });
      if (result.ok) {
        setCode("");
        await queryClient.invalidateQueries();
      } else {
        toast.error(
          result.reason === "rate_limited"
            ? "Too many tries. Please wait 15 minutes and try again."
            : "That code doesn't match. Please check and try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(docType: string) {
    const { url } = await docFn({ data: { slug, docType } });
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("That document isn't available yet.");
  }

  if (query.isLoading) {
    return <PageLoading />;
  }

  const data = query.data;

  if (data && !data.unlocked) {
    if (!data.exists) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-sand px-5">
          <div className="max-w-sm text-center">
            <h1 className="heading-display text-2xl text-primary">Wallet not found</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This link isn't active. Please check the link we sent you, or get in touch and we'll
              send a fresh one.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-12">
        <div className="surface-card w-full max-w-sm p-7 text-center">
          <Lock className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-4 text-[0.8125rem] font-medium text-muted-foreground">
            The Family Wallet
          </p>
          <h1 className="heading-display mt-2 text-2xl text-primary">{data.familyName}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter the 6-character access code we sent you. You'll only need to do this once on this
            device.
          </p>
          <form onSubmit={onUnlock} className="mt-5 space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={10}
              autoCapitalize="characters"
              className="text-center text-lg tracking-[0.3em]"
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking…" : "Open my wallet"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!data?.unlocked) return null;

  // Without the agreement there is nothing to build or sign, so nothing is chased on the home screen.
  const agreementsEnabled = data.wallet.agreementsEnabled;
  const props = {
    slug,
    wallet: data.wallet,
    hub,
    agreement: agreementsEnabled ? agreement : null,
    agreementDone: agreementsEnabled ? agreementDone : true,
    agreementSubtitle,
    nannyCount: nannies.length,
    agreementsEnabled,
    outstandingAgreements: agreementsEnabled ? outstandingAgreements : [],
    openDoc: (docType: string) => void openDoc(docType),
    onLock: () => {
      void lockFn({ data: { slug } }).then(() =>
        queryClient.invalidateQueries({ queryKey: ["wallet", slug] }),
      );
    },
  };

  return data.wallet.access === "nanny" ? (
    <NannyDashboard {...props} />
  ) : (
    <FamilyDashboard {...props} />
  );
}

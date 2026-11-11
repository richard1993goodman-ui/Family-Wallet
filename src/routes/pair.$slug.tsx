import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";

import { CreateLogin } from "@/components/CreateLogin";
import { Card, HubPage, PageContainer, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPairPinFn, getWalletSummary, redeemPairPinFn } from "@/lib/wallet.functions";

export const Route = createFileRoute("/pair/$slug")({
  head: () => ({
    meta: [
      { title: "Add a device — Family Wallet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { pin?: string | undefined } => ({
    pin: typeof search["pin"] === "string" ? search["pin"] : undefined,
  }),
  component: PairPage,
});

function PairPage() {
  const { slug } = Route.useParams();
  const summaryFn = useServerFn(getWalletSummary);
  const summary = useQuery({ queryKey: ["wallet", slug], queryFn: () => summaryFn({ data: { slug } }) });

  if (summary.isLoading) return <PageLoading />;
  return summary.data?.unlocked ? <Create slug={slug} /> : <Redeem slug={slug} />;
}

/** On a device that is already signed in: make a PIN and QR for the new device. */
function Create({ slug }: { slug: string }) {
  const createFn = useServerFn(createPairPinFn);
  const [pin, setPin] = useState<{ pin: string; expiresAt: string } | null>(null);
  const [qr, setQr] = useState("");
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pin) return;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(pin.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pin]);

  const make = async () => {
    setBusy(true);
    try {
      const result = await createFn({ data: { slug } });
      if (!result) throw new Error("PINs can't be made for this wallet.");
      setPin(result);
      setQr(await QRCode.toDataURL(`${window.location.origin}/pair/${slug}?pin=${result.pin}`, { margin: 1, width: 240 }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't make a PIN");
    } finally {
      setBusy(false);
    }
  };

  const live = pin && left > 0;
  return (
    <HubPage slug={slug} title="Add a device" intro="Pair a partner's or co-parent's phone without sharing your permanent access code. A PIN works once and expires after 10 minutes.">
      <Card>
        {live ? (
          <div className="text-center">
            <p className="heading-display text-5xl tracking-[0.3em] text-foreground">{pin.pin}</p>
            {qr && <img src={qr} alt="QR code that pairs a new device" className="mx-auto mt-4 h-48 w-48" />}
            <p className="mt-3 text-sm text-muted-foreground">
              Expires in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}. The new device gets full family access, so only share this with someone you trust.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{pin ? "That PIN has expired." : "No active PIN."}</p>
        )}
        <Button className="mt-4" disabled={busy} onClick={make}>
          <Smartphone className="h-4 w-4" /> {live ? "Make a new PIN" : "Make a PIN"}
        </Button>
      </Card>
      <CreateLogin slug={slug} />
    </HubPage>
  );
}

/** On the new device: enter the PIN (or arrive with it from the QR code). */
function Redeem({ slug }: { slug: string }) {
  const { pin: fromLink } = Route.useSearch();
  const redeemFn = useServerFn(redeemPairPinFn);
  const client = useQueryClient();
  const navigate = useNavigate();
  const [pin, setPin] = useState(fromLink ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await redeemFn({ data: { slug, pin } });
      if (result.ok) {
        await client.invalidateQueries({ queryKey: ["wallet", slug] });
        toast.success("Device paired");
        await navigate({ to: "/today/$slug", params: { slug } });
      } else {
        toast.error(result.reason === "rate_limited" ? "Too many tries. Wait a few minutes." : "That PIN is wrong or has expired.");
      }
    } catch {
      toast.error("Couldn't pair this device.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <h1 className="heading-display text-3xl text-foreground">Pair this device</h1>
      <p className="mt-2 text-sm text-muted-foreground">Enter the 6-character PIN shown on the other phone, or scan its QR code.</p>
      <Card className="mt-6">
        <Input
          value={pin}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="6-character PIN"
          className="h-12 text-center font-mono text-2xl tracking-[0.3em]"
          onChange={(e) => setPin(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && pin.length === 6 && submit()}
        />
        <Button className="mt-4 w-full" disabled={busy || pin.length !== 6} onClick={submit}>
          Pair device
        </Button>
      </Card>
    </PageContainer>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteFn, lookupInviteFn } from "@/lib/seat-invites.functions";

export const Route = createFileRoute("/join/$token")({
  head: () => ({ meta: [{ title: "Activate your Family Wallet" }, { name: "robots", content: "noindex" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const lookup = useServerFn(lookupInviteFn);
  const accept = useServerFn(acceptInviteFn);
  const invite = useQuery({ queryKey: ["invite", token], queryFn: () => lookup({ data: { token } }), retry: false });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ url: string; code: string; nannyName: string | null } | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      setDone(await accept({ data: { token, familyName: name } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't activate your wallet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      {invite.isLoading ? (
        <p className="text-sm text-muted-foreground">Checking your invitation…</p>
      ) : done ? (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="heading-display text-2xl text-foreground">Your wallet is ready</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Save these now. We've also emailed them to you. Only your family can open your wallet.
            {done.nannyName && ` ${done.nannyName} has been added to your household staff and has been emailed their own sign-in.`}
          </p>
          <p className="mt-4 text-xs font-medium text-muted-foreground">Your private link</p>
          <p className="break-all text-sm text-foreground">{done.url}</p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">Access code</p>
          <p className="heading-display text-3xl tracking-[0.2em] text-foreground">{done.code}</p>
          <div className="mt-4 flex gap-2">
            <CopyButton text={`${done.url}\nCode: ${done.code}`} label="Copy both" />
            <Button asChild>
              <a href={done.url}>Open my wallet</a>
            </Button>
          </div>
        </div>
      ) : invite.data ? (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="heading-display text-2xl text-foreground">Activate your Family Wallet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {invite.data.agencyName} has set you up with a Family Wallet. It's private to your family: {invite.data.agencyName} can't see what you add.
            {invite.data.nannyName && ` ${invite.data.nannyName} will be added to your household and get their own sign-in.`}
          </p>
          <label className="mt-5 block text-sm font-medium text-foreground">
            Your family name
            <Input className="mt-1.5" value={name} placeholder="The Harrington Family" onChange={(e) => setName(e.target.value)} />
          </label>
          <Button className="mt-4 w-full" disabled={busy || !name.trim()} onClick={submit}>
            Create my wallet
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
          <h1 className="heading-display text-2xl text-foreground">This invitation isn't valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have expired or already been used. Ask your agency to send a new one.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Go to Family Wallet</Link>
          </Button>
        </div>
      )}
    </main>
  );
}

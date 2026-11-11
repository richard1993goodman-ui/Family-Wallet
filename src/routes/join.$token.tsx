import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { JoinDone, type JoinResult } from "@/components/JoinDone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteFn, lookupInviteFn } from "@/lib/seat-invites.functions";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/join/$token")({
  head: () => ({ meta: [{ title: "Activate your Family Wallet" }, { name: "robots", content: "noindex" }] }),
  component: JoinPage,
});

function JoinPage() {
  const t = useT();
  const { token } = Route.useParams();
  const lookup = useServerFn(lookupInviteFn);
  const accept = useServerFn(acceptInviteFn);
  const invite = useQuery({ queryKey: ["invite", token], queryFn: () => lookup({ data: { token } }), retry: false });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<JoinResult | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      setDone(await accept({ data: { token, familyName: name } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("join.errorFallback"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      {invite.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("join.checking")}</p>
      ) : done ? (
        <JoinDone done={done} />
      ) : invite.data ? (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="heading-display text-2xl text-foreground">{t("join.activateTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("join.activateIntro", { agency: invite.data.agencyName })}
          </p>
          <label className="mt-5 block text-sm font-medium text-foreground">
            {t("join.familyName")}
            <Input className="mt-1.5" value={name} placeholder={t("join.familyPlaceholder")} onChange={(e) => setName(e.target.value)} />
          </label>
          <Button className="mt-4 w-full" disabled={busy || !name.trim()} onClick={submit}>
            {t("join.create")}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
          <h1 className="heading-display text-2xl text-foreground">{t("join.invalidTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("join.invalidBody")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">{t("join.goHome")}</Link>
          </Button>
        </div>
      )}
    </main>
  );
}

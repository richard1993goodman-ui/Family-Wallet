import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { JoinDone, type JoinResult } from "@/components/JoinDone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteFn, lookupInviteByCodeFn } from "@/lib/seat-invites.functions";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/join/")({
  head: () => ({
    meta: [
      { title: "Enter your invitation code | Family Wallet" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinByCode,
});

/** For families whose invitation link won't open: type the backup code instead. */
function JoinByCode() {
  const t = useT();
  const lookup = useServerFn(lookupInviteByCodeFn);
  const accept = useServerFn(acceptInviteFn);
  const [code, setCode] = useState("");
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<JoinResult | null>(null);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("joinCode.errorFallback"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      {done ? (
        <JoinDone done={done} />
      ) : agencyName ? (
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="heading-display text-2xl text-foreground">{t("join.activateTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("join.activateIntro", { agency: agencyName })}
          </p>
          <label className="mt-5 block text-sm font-medium text-foreground">
            {t("join.familyName")}
            <Input
              className="mt-1.5"
              value={name}
              placeholder={t("join.familyPlaceholder")}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <Button
            className="mt-4 w-full"
            disabled={busy || !name.trim()}
            onClick={() =>
              run(async () => setDone(await accept({ data: { code, familyName: name } })))
            }
          >
            {t("join.create")}
          </Button>
        </div>
      ) : (
        <form
          className="rounded-2xl bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => setAgencyName((await lookup({ data: { code } })).agencyName));
          }}
        >
          <h1 className="heading-display text-2xl text-foreground">{t("joinCode.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("joinCode.intro")}
          </p>
          <Input
            className="mt-4 uppercase tracking-[0.3em]"
            value={code}
            maxLength={12}
            placeholder="ABCD2345"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button type="submit" className="mt-3 w-full" disabled={busy || code.trim().length < 8}>
            {t("joinCode.continue")}
          </Button>
        </form>
      )}
    </main>
  );
}

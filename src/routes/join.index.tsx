import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
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
          className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => setAgencyName((await lookup({ data: { code } })).agencyName));
          }}
        >
          <span className="mb-4 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <Building2 className="size-5" aria-hidden />
          </span>
          <h1 className="heading-display text-2xl text-foreground">{t("joinCode.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("joinCode.intro")}</p>
          <Input
            aria-label={t("joinCode.title")}
            className="mt-5 h-14 rounded-[0.875rem] text-center font-mono text-base uppercase tracking-[0.3em] md:text-base"
            value={code}
            maxLength={12}
            placeholder="ABCD2345"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button
            type="submit"
            size="lg"
            className="mt-3 h-14 w-full rounded-[0.875rem] text-base font-semibold"
            disabled={busy || code.trim().length < 8}
          >
            {t("joinCode.continue")} <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Link
            to="/login"
            className="mt-4 block text-center text-[0.8125rem] text-muted-foreground underline-offset-4 hover:underline"
          >
            Already have a wallet? Open it
          </Link>
        </form>
      )}
    </main>
  );
}

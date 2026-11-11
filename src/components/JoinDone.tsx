import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

export type JoinResult = { url: string; code: string };

/** Shown once, after a family redeems its invitation: its own wallet link and access code. */
export function JoinDone({ done }: { done: JoinResult }) {
  const t = useT();
  const accountsOn = import.meta.env["VITE_ACCOUNTS_ENABLED"] === "true";
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <h1 className="heading-display text-2xl text-foreground">{t("done.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("done.intro")}</p>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{t("done.link")}</p>
      <p className="break-all text-sm text-foreground">{done.url}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{t("done.code")}</p>
      <p className="heading-display text-3xl tracking-[0.2em] text-foreground">{done.code}</p>
      <div className="mt-4 flex gap-2">
        <CopyButton text={`${done.url}\nCode: ${done.code}`} label={t("done.copyBoth")} />
        <Button asChild>
          <a href={done.url}>{t("done.open")}</a>
        </Button>
      </div>
      {accountsOn && <p className="mt-4 text-xs text-muted-foreground">{t("done.loginHint")}</p>}
    </div>
  );
}

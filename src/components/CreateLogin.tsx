import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccountStatus, startAccountClaim } from "@/lib/account.functions";
import { useT } from "@/lib/i18n/provider";

/** "Create your own login": optional, emailed as a one-time link. Hidden until accounts are switched on. */
export function CreateLogin({ slug }: { slug: string }) {
  const t = useT();
  const statusFn = useServerFn(getAccountStatus);
  const claim = useServerFn(startAccountClaim);
  const status = useQuery({
    queryKey: ["account-status", slug],
    queryFn: () => statusFn({ data: { slug } }),
  });
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!status.data?.enabled) return null;
  if (status.data.claimed) {
    return (
      <Card className="mt-4">
        <p className="text-sm text-muted-foreground">
          {t("login.have")}{" "}
          <a className="underline" href="/account">
            {t("login.signInLink")}
          </a>
        </p>
      </Card>
    );
  }
  if (!status.data.canClaim) return null;

  const send = async () => {
    setBusy(true);
    try {
      await claim({ data: { slug, email } });
      setSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("login.sendError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-4">
      <h2 className="font-medium text-foreground">{t("login.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("login.intro")}</p>
      {sent ? (
        <p className="mt-3 text-sm text-foreground">{t("login.sent")}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="min-w-0 flex-1"
            type="email"
            value={email}
            placeholder={t("login.emailPlaceholder")}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button disabled={busy || !email.includes("@")} onClick={send}>
            {t("login.send")}
          </Button>
        </div>
      )}
    </Card>
  );
}

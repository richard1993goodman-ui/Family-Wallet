import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import { finishAccountClaim } from "@/lib/account.functions";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/claim/$token")({
  head: () => ({
    meta: [{ title: "Create your Family Wallet login" }, { name: "robots", content: "noindex" }],
  }),
  component: ClaimPage,
});

/** Opened from the emailed link: uses it once, then signs the person in. */
function ClaimPage() {
  const t = useT();
  const { token } = Route.useParams();
  const finish = useServerFn(finishAccountClaim);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // The link works once, so make sure the effect never runs twice.
    if (started.current) return;
    started.current = true;
    finish({ data: { token } })
      .then((result) => window.location.assign(result.actionLink))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("claim.failedFallback")),
      );
  }, [finish, token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="heading-display text-2xl text-foreground">{t("claim.failedTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("claim.creating")}</p>
        )}
      </div>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { findMyWallets, linkMyWallet, myHouseholds } from "@/lib/account.functions";
import { siteUrl } from "@/lib/site";
import { useT } from "@/lib/i18n/provider";
import { LanguagePicker } from "@/components/LanguagePicker";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [{ title: "Your Family Wallet account" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const t = useT();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        {signedIn === null ? (
          <p className="text-sm text-muted-foreground">{t("account.loading")}</p>
        ) : signedIn ? (
          <Households />
        ) : (
          <SignIn />
        )}
      </div>
    </main>
  );
}

function SignIn() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    // With accounts on, a new email creates a login (a family signing up). Either way the answer is the same.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: import.meta.env["VITE_ACCOUNTS_ENABLED"] === "true",
        emailRedirectTo: siteUrl("/account"),
      },
    });
    setBusy(false);
    // Say the same thing either way, so this page can't be used to find out who has a login.
    if (error && error.status !== 400 && error.status !== 422) toast.error(t("account.sendError"));
    else setSent(true);
  };

  return sent ? (
    <>
      <h1 className="heading-display text-2xl text-foreground">{t("account.checkTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("account.checkBody")}</p>
    </>
  ) : (
    <>
      <h1 className="heading-display text-2xl text-foreground">{t("account.signInTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("account.signInIntro")}</p>
      <Input
        className="mt-4"
        type="email"
        value={email}
        placeholder={t("login.emailPlaceholder")}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button className="mt-3 w-full" disabled={busy || !email.includes("@")} onClick={send}>
        {t("account.emailLink")}
      </Button>
    </>
  );
}

/** Signed in but in no household yet: offer the wallet that belongs to this email, or point to the plans. */
function NoWalletYet({ onLinked }: { onLinked: () => void }) {
  const t = useT();
  const find = useServerFn(findMyWallets);
  const link = useServerFn(linkMyWallet);
  const offers = useQuery({ queryKey: ["my-wallet-offers"], queryFn: () => find() });
  const [busy, setBusy] = useState(false);

  const open = async (familyId: string) => {
    setBusy(true);
    try {
      await link({ data: { familyId } });
      onLinked();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.sendError"));
    } finally {
      setBusy(false);
    }
  };

  if (offers.isLoading)
    return <p className="mt-3 text-sm text-muted-foreground">{t("account.householdsLoading")}</p>;
  if (offers.data?.length)
    return (
      <>
        <p className="mt-3 text-sm text-muted-foreground">{t("account.foundBody")}</p>
        <ul className="mt-4 space-y-2">
          {offers.data.map((o) => (
            <li key={o.id}>
              <Button
                className="w-full justify-between"
                disabled={busy}
                onClick={() => void open(o.id)}
              >
                {t("account.openWallet", { name: o.familyName })}
              </Button>
            </li>
          ))}
        </ul>
      </>
    );
  return (
    <>
      <p className="mt-3 text-sm text-muted-foreground">{t("account.noWalletBody")}</p>
      <Button asChild className="mt-4 w-full">
        <a href="/pricing">{t("account.seePlans")}</a>
      </Button>
    </>
  );
}

function Households() {
  const t = useT();
  const list = useServerFn(myHouseholds);
  const homes = useQuery({ queryKey: ["my-households"], queryFn: () => list() });

  return (
    <>
      <h1 className="heading-display text-2xl text-foreground">{t("account.householdsTitle")}</h1>
      {homes.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("account.householdsLoading")}</p>
      ) : homes.data?.length ? (
        <ul className="mt-4 space-y-2">
          {homes.data.map((h) => (
            <li key={h.slug}>
              <Button asChild variant="outline" className="w-full justify-between">
                <a href={`/w/${h.slug}`}>{h.familyName}</a>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <NoWalletYet onLinked={() => void homes.refetch()} />
      )}
      <Button variant="ghost" className="mt-4" onClick={() => void supabase.auth.signOut()}>
        {t("account.signOut")}
      </Button>
      <LanguagePicker />
    </>
  );
}

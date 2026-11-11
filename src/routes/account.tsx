import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { myHouseholds } from "@/lib/account.functions";
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
    // shouldCreateUser is false: logins are only created by claiming one from inside a wallet.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: siteUrl("/account") },
    });
    setBusy(false);
    // Say the same thing either way, so this page can't be used to find out who has a login.
    if (error && error.status !== 400 && error.status !== 422)
      toast.error(t("account.sendError"));
    else setSent(true);
  };

  return sent ? (
    <>
      <h1 className="heading-display text-2xl text-foreground">{t("account.checkTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("account.checkBody")}
      </p>
    </>
  ) : (
    <>
      <h1 className="heading-display text-2xl text-foreground">{t("account.signInTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("account.signInIntro")}
      </p>
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
        <p className="mt-3 text-sm text-muted-foreground">
          {t("account.householdsNone")}
        </p>
      )}
      <Button variant="ghost" className="mt-4" onClick={() => void supabase.auth.signOut()}>
        {t("account.signOut")}
      </Button>
      <LanguagePicker />
    </>
  );
}

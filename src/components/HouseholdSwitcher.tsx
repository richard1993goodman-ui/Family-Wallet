import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { myHouseholds } from "@/lib/account.functions";

/**
 * The household's name in the top bar. Someone signed in with their own account who belongs to more than one
 * household (a nanny with several families) can switch between them here. Everyone else just sees the name.
 */
export function HouseholdSwitcher({ slug, familyName }: { slug: string; familyName: string }) {
  const navigate = useNavigate();
  const list = useServerFn(myHouseholds);
  const [signedIn, setSignedIn] = useState(false);
  const accountsOn = import.meta.env["VITE_ACCOUNTS_ENABLED"] === "true";

  useEffect(() => {
    if (!accountsOn) return;
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, [accountsOn]);

  const homes = useQuery({
    queryKey: ["my-households"],
    queryFn: () => list(),
    enabled: accountsOn && signedIn,
  });

  // Only inside a household the account belongs to (not the demo, or a wallet opened by code alone).
  if (!homes.data || homes.data.length < 2 || !homes.data.some((h) => h.slug === slug)) {
    return <p className="truncate text-sm font-medium text-foreground">{familyName}</p>;
  }
  return (
    <select
      aria-label="Switch household"
      className="min-w-0 max-w-[14rem] truncate rounded-md border border-input bg-card px-2 py-1 text-sm font-medium text-foreground"
      value={slug}
      onChange={(e) => void navigate({ to: "/w/$slug", params: { slug: e.target.value } })}
    >
      {homes.data.map((h) => (
        <option key={h.slug} value={h.slug}>
          {h.familyName}
        </option>
      ))}
    </select>
  );
}

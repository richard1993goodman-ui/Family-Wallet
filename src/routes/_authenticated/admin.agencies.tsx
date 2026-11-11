import { requireTwoStepClient } from "@/lib/two-step";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { getAgencyTierBoardFn, upgradeAgencyTierFn } from "@/lib/agencies.functions";
import { Button } from "@/components/ui/button";
import { formatPounds } from "@/lib/agency-plans";

export const Route = createFileRoute("/_authenticated/admin/agencies")({
  beforeLoad: () => requireTwoStepClient(),
  head: () => ({
    meta: [{ title: "Partner agencies — The Family Wallet" }, { name: "robots", content: "noindex" }],
  }),
  component: AgenciesPage,
});

/** The owner sees each active agency's tier and seat use, and can move it up a tier. Nothing else. */
function AgenciesPage() {
  const qc = useQueryClient();
  const boardFn = useServerFn(getAgencyTierBoardFn);
  const upgradeFn = useServerFn(upgradeAgencyTierFn);
  const board = useQuery({ queryKey: ["agency-tier-board"], queryFn: () => boardFn() });
  const [busy, setBusy] = useState<string | null>(null);

  const upgrade = async (a: NonNullable<typeof board.data>[number]) => {
    if (!a.next) return;
    const cost = a.next.pence === null ? "" : ` Their plan changes to ${formatPounds(a.next.pence)} a month, and Stripe pro-rates the difference.`;
    if (!window.confirm(`Move ${a.name} from ${a.tier} to ${a.next.name}?${cost}`)) return;
    setBusy(a.id);
    try {
      const result = await upgradeFn({ data: { agencyId: a.id, fromPlan: a.plan } });
      await qc.invalidateQueries({ queryKey: ["agency-tier-board"] });
      toast.success(result.billing === "stripe" ? `${a.name} moved to ${a.next.name}` : `${a.name} moved to ${a.next.name}. They have no Stripe subscription, so billing wasn't changed.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change the tier");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-sand">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="heading-display mt-3 text-3xl text-primary">Partner agencies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Active agencies, their tier and how many household seats they use.</p>

        {board.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {board.data?.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No active agencies yet.</p>}

        <div className="mt-6 space-y-3">
          {board.data?.map((a) => {
            const used = a.occupied + a.invited;
            const pct = a.allowance ? Math.min(100, Math.round((used / a.allowance) * 100)) : 0;
            return (
              <div key={a.id} className="rounded-2xl bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.tier}
                      {a.pence !== null && ` · ${formatPounds(a.pence)} a month`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="heading-display text-2xl text-foreground">
                      {a.occupied}
                      <span className="text-base text-muted-foreground"> / {a.allowance ?? "∞"} households</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.remaining === null ? "No fixed limit" : `${a.remaining} remaining`}
                      {a.invited > 0 && ` · ${a.invited} invited`}
                    </p>
                  </div>
                </div>
                {a.allowance !== null && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${a.name} seats used`}>
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  {a.next ? (
                    <Button size="sm" variant="outline" disabled={busy === a.id} onClick={() => upgrade(a)}>
                      Move to {a.next.name}
                      {a.next.allowance !== null && ` (${a.next.allowance} seats)`}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Top self-serve tier. Enterprise is by agreement.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

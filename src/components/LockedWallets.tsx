import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listLockedFn, setDeletionFlagFn } from "@/lib/lifecycle.functions";
import { formatDate } from "@/lib/format";

/** Owner view of wallets in their 30-day window: when each goes, what was sent, and the hold and confirm switches. */
export function LockedWallets() {
  const client = useQueryClient();
  const listFn = useServerFn(listLockedFn);
  const flagFn = useServerFn(setDeletionFlagFn);
  const locked = useQuery({ queryKey: ["locked-wallets"], queryFn: () => listFn() });

  const set = async (id: string, flag: "hold" | "confirmed", value: boolean) => {
    try {
      await flagFn({ data: { id, flag, value } });
      await client.invalidateQueries({ queryKey: ["locked-wallets"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    }
  };

  if (!locked.data?.length) return null;
  return (
    <section className="mt-6 rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="text-lg font-medium text-foreground">Locked wallets ({locked.data.length})</h2>
      <p className="mt-1 text-sm text-muted-foreground">Each is deleted 30 days after locking, after reminders. Hold a wallet to stop that.</p>
      <ul className="mt-3 divide-y divide-border">
        {locked.data.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium text-foreground">{w.familyName}</p>
              <p className="text-muted-foreground">
                {w.status === "cancelled" ? "Cancelled" : "Suspended"}
                {w.deleteAfter ? `, deleted ${formatDate(w.deleteAfter, { day: "numeric", month: "short", year: "numeric" })} (${w.daysLeft} days)` : ""}
                {" · "}
                {w.hasEmail ? `reminders sent: ${w.noticesSent.length}` : "no email, can't be reminded"}
                {w.hold ? " · ON HOLD" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {!w.hasEmail && (
                <Button size="sm" variant={w.confirmed ? "default" : "outline"} onClick={() => set(w.id, "confirmed", !w.confirmed)}>
                  {w.confirmed ? "Deletion confirmed" : "Confirm deletion"}
                </Button>
              )}
              <Button size="sm" variant={w.hold ? "default" : "outline"} onClick={() => set(w.id, "hold", !w.hold)}>
                {w.hold ? "Release hold" : "Hold"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

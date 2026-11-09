import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setMyAgencyAgreements } from "@/lib/agencies.functions";

/** A partner agency decides whether its families use the wallet's nanny agreement at all. */
export function AgencyAgreementSetting({ enabled, statusKey }: { enabled: boolean; statusKey: readonly unknown[] }) {
  const client = useQueryClient();
  const saveFn = useServerFn(setMyAgencyAgreements);
  const [busy, setBusy] = useState(false);

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      await saveFn({ data: { enabled: next } });
      await client.invalidateQueries({ queryKey: statusKey });
      toast.success(next ? "Families can use the nanny agreement" : "The nanny agreement is off for your families");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl bg-card p-5 ring-1 ring-border">
      <h2 className="font-semibold text-foreground">Nanny agreements</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {enabled
          ? "Your families can build and sign their nanny agreement in the wallet, or choose to skip it."
          : "Off for all your families. They won't see the agreement and will add working hours by hand instead. Use this if you give families an agreement yourselves."}
      </p>
      <Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={() => void change(!enabled)}>
        {enabled ? "Don't use agreements in the wallet" : "Use agreements in the wallet"}
      </Button>
    </section>
  );
}

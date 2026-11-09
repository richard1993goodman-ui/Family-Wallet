import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { setUseAgreementFn } from "@/lib/work-hours.functions";
import { getWalletSummary } from "@/lib/wallet.functions";

/** Parents choose whether to build and sign the nanny agreement in the wallet, or manage it themselves. */
export function AgreementChoice({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const summaryFn = useServerFn(getWalletSummary);
  const setFn = useServerFn(setUseAgreementFn);
  const summary = useQuery({ queryKey: ["wallet", slug], queryFn: () => summaryFn({ data: { slug } }) });
  const [busy, setBusy] = useState(false);
  const wallet = summary.data?.unlocked ? summary.data.wallet : null;
  if (!wallet || wallet.access !== "family") return null;

  const choose = async (use: boolean) => {
    setBusy(true);
    try {
      await setFn({ data: { slug, use } });
      await client.invalidateQueries();
      if (use) toast.success("The nanny agreement is back on");
      else {
        toast.success("Got it. Let's add your nanny's working hours.");
        void navigate({ to: "/hours/$slug", params: { slug } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that choice");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-foreground">Nanny agreement</h2>
      {wallet.agreementsLockedByAgency ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Your agency looks after the agreement outside the wallet. Add your nanny's working hours so the week fits your family.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/hours/$slug" params={{ slug }}>Add working hours</Link>
          </Button>
        </>
      ) : wallet.agreementsEnabled ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Build and sign your agreement with each person here. Already have one, or don't need one? You can skip it and just use the wallet to run your week.
          </p>
          <Button className="mt-4" variant="outline" disabled={busy} onClick={() => void choose(false)}>
            I don't want to use the agreement
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            You're not using the nanny agreement. Working hours are set by hand and fill in your weekly schedule.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/hours/$slug" params={{ slug }}>Add working hours</Link>
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void choose(true)}>
              Use the agreement
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

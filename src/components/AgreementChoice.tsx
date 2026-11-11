import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { setAgreementChoiceFn } from "@/lib/work-hours.functions";
import { getWalletSummary } from "@/lib/wallet.functions";

type Choice = "template" | "self_employed" | "none";

const OPTIONS: { choice: Choice; title: string; body: string; action: string }[] = [
  {
    choice: "template",
    title: "Use a template agreement",
    body: "A formal employment agreement for your nanny, built from a template and signed by both of you here. Their days and hours fill in your calendar.",
    action: "Use the template",
  },
  {
    choice: "self_employed",
    title: "Set up a self-employed agreement",
    body: "For a nanny who is genuinely in business for themselves: they invoice you, carry their own insurance and can send a substitute. Their sessions fill in your calendar.",
    action: "Set up self-employed",
  },
  {
    choice: "none",
    title: "Don't use an agreement",
    body: "Already have one, or don't need one? Skip it and add your nanny's hours by hand, including split shifts.",
    action: "Skip the agreement",
  },
];

/**
 * Parents choose how to set up the nanny arrangement: a template agreement, a self-employed agreement, or none.
 * `firstSignIn` shows it on the Home screen until they choose; elsewhere it lets them change their mind.
 */
export function AgreementChoice({ slug, firstSignIn = false }: { slug: string; firstSignIn?: boolean }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const summaryFn = useServerFn(getWalletSummary);
  const setFn = useServerFn(setAgreementChoiceFn);
  const summary = useQuery({ queryKey: ["wallet", slug], queryFn: () => summaryFn({ data: { slug } }) });
  const [busy, setBusy] = useState<Choice | null>(null);
  const wallet = summary.data?.unlocked ? summary.data.wallet : null;
  if (!wallet || wallet.access !== "family") return null;
  // Set for this household by whoever runs it: nothing for the parents to choose.
  if (wallet.agreementsLockedByAgency) return null;
  if (firstSignIn && wallet.agreementChoice !== null) return null;
  if (firstSignIn && slug === "demo") return null;

  const choose = async (choice: Choice) => {
    setBusy(choice);
    try {
      await setFn({ data: { slug, choice } });
      await client.invalidateQueries();
      if (choice === "template") void navigate({ to: "/agreement/$slug", params: { slug }, search: { start: "employed" } });
      else if (choice === "self_employed") void navigate({ to: "/agreement/$slug", params: { slug }, search: { start: "self_employed" } });
      else {
        toast.success("Got it. Let's add your nanny's working hours.");
        void navigate({ to: "/hours/$slug", params: { slug }, search: { edit: "first" } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that choice");
    } finally {
      setBusy(null);
    }
  };

  const current = wallet.agreementChoice;
  return (
    <Card>
      <h2 className="font-semibold text-foreground">
        {firstSignIn ? "How would you like to set up your nanny?" : "Nanny agreement"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {firstSignIn
          ? "Choose one to get started. Whichever you pick, you can add school holidays and key dates to your calendar, and set your own shift pattern if you don't want to use the agreement's hours."
          : "Change how you handle your nanny's agreement. You can switch at any time."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <div key={o.choice} className={`flex flex-col rounded-2xl p-4 ring-1 ${current === o.choice ? "ring-2 ring-primary" : "ring-border"}`}>
            <p className="font-medium text-foreground">{o.title}</p>
            <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{o.body}</p>
            <Button
              className="mt-3"
              variant={current === o.choice ? "default" : "outline"}
              disabled={busy !== null}
              onClick={() => void choose(o.choice)}
            >
              {current === o.choice && !firstSignIn ? "Open" : o.action}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

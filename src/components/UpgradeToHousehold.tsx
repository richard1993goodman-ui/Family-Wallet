import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { HubPage } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

/** Shown in place of a Household-only tool for wallets on the Family plan. */
export function UpgradeToHousehold({ slug, title, what, isNanny }: { slug: string; title: string; what: string; isNanny: boolean }) {
  return (
    <HubPage slug={slug} title={title}>
      <div className="surface-card mx-auto max-w-md p-8 text-center">
        <Lock className="mx-auto size-5 text-primary" />
        <h2 className="heading-display mt-4 text-2xl text-foreground">Part of the Household plan</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {what} {isNanny ? "Ask the family to move to the Household plan to use it." : "Move to the Household plan to unlock it for your family and carers."}
        </p>
        {!isNanny && (
          <Button asChild className="mt-6">
            <Link to="/pricing">See the Household plan</Link>
          </Button>
        )}
      </div>
    </HubPage>
  );
}

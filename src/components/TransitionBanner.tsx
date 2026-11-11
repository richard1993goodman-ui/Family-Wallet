import { formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getContinuationFn } from "@/lib/billing.functions";

/** Shown to a family whose agency stopped funding its wallet, until it subscribes or the grace period ends. */
export function TransitionBanner({ slug }: { slug: string }) {
  const stateFn = useServerFn(getContinuationFn);
  const state = useQuery({ queryKey: ["continuation", slug], queryFn: () => stateFn({ data: { slug } }), enabled: slug !== "demo" });
  if (state.data?.state !== "transition") return null;
  const until = state.data.endsAt ? formatDate(state.data.endsAt, { day: "numeric", month: "long" }) : "soon";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-warning-soft px-4 py-2 text-sm text-warning md:px-8">
      <span className="font-medium">Your agency-funded access ends on {until}.</span>
      <Link to="/continue/$slug" params={{ slug }} className="underline underline-offset-4">
        Continue with your own subscription
      </Link>
    </div>
  );
}

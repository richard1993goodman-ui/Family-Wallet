import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";

import { getFirst48 } from "@/lib/welcome.functions";

export function WelcomeCard({ slug }: { slug: string }) {
  const welcomeFn = useServerFn(getFirst48);
  const welcomeQuery = useQuery({
    queryKey: ["first48", slug],
    queryFn: () => welcomeFn({ data: { slug } }),
  });
  const welcome = welcomeQuery.data;

  if (!welcome) return null;
  const done = welcome.nannies.reduce((total, nanny) => total + nanny.doneCount, 0);
  const total = welcome.nannies.reduce((total, nanny) => total + nanny.total, 0);
  const completed = total > 0 && done === total;
  if (completed) return null;

  return (
    <Link
      to="/welcome/$slug"
      params={{ slug }}
      className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-foreground/25"
    >
      <span>
        <span className="block font-medium text-foreground">
          {completed ? "First 48 hours — agreed together" : "First 48 hours — a confident start"}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {total
            ? `${done} of ${total} agreed by parent and nanny · Routines, pickups and your first handover`
            : "Add your nanny, then agree the essentials together."}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

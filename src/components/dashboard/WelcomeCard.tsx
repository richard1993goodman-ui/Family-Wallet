import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

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
      className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-accent p-5 hover:border-primary"
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
      <Sparkles className="h-5 w-5 flex-shrink-0 text-primary" />
    </Link>
  );
}

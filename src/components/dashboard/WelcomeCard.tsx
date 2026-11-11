import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";

import { getFirst48 } from "@/lib/welcome.functions";
import { useT } from "@/lib/i18n/provider";

export function WelcomeCard({ slug }: { slug: string }) {
  const t = useT();
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
          {completed ? t("dash.first48Done") : t("dash.first48Start")}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {total
            ? t("dash.first48Progress", { done, total })
            : t("dash.first48Empty")}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

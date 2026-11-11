import { Link } from "@tanstack/react-router";
import { CalendarClock, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardProps } from "@/components/dashboard/types";
import { hasHours } from "@/lib/work-hours";
import { useT } from "@/lib/i18n/provider";

/**
 * The one thing a family should do next, as a highlighted box at the top of the home screen:
 * add their nanny, then (if they aren't using the agreement) set the hours the week is built from.
 */
export function NextStep({ slug, hub, nannyCount, agreementsEnabled }: DashboardProps) {
  const t = useT();
  const hoursSet = (hub?.schedules ?? []).some((s) => hasHours(s.workingDays));
  const step =
    nannyCount === 0
      ? {
          icon: UserPlus,
          title: t("dash.addYourNanny"),
          body: t("dash.nextAddNannyBody"),
          cta: t("dash.addYourNanny"),
          to: "/nannies/$slug" as const,
        }
      : !agreementsEnabled && !hoursSet
        ? {
            icon: CalendarClock,
            title: t("dash.setYourNannySWorking"),
            body: t("dash.nextHoursBody"),
            cta: t("dash.addWorkingHours"),
            to: "/hours/$slug" as const,
          }
        : null;
  if (!step) return null;
  const Icon = step.icon;
  return (
    <section className="rounded-2xl border-2 border-primary bg-accent p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">{t("dash.nextStep")}</p>
          <h2 className="heading-display mt-0.5 text-xl text-foreground">{step.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          <Button className="mt-4" size="lg" asChild>
            <Link to={step.to} params={{ slug }}>
              {step.cta}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

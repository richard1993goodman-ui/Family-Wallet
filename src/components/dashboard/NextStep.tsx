import { Link } from "@tanstack/react-router";
import { CalendarClock, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DashboardProps } from "@/components/dashboard/types";
import { hasHours } from "@/lib/work-hours";

/**
 * The one thing a family should do next, as a highlighted box at the top of the home screen:
 * add their nanny, then (if they aren't using the agreement) set the hours the week is built from.
 */
export function NextStep({ slug, hub, nannyCount, agreementsEnabled }: DashboardProps) {
  const hoursSet = (hub?.schedules ?? []).some((s) => hasHours(s.workingDays));
  const step =
    nannyCount === 0
      ? {
          icon: UserPlus,
          title: "Add your nanny",
          body: "Start here. Add the person who looks after your children and invite them to join, so you can share the week, messages and updates.",
          cta: "Add your nanny",
          to: "/nannies/$slug" as const,
        }
      : !agreementsEnabled && !hoursSet
        ? {
            icon: CalendarClock,
            title: "Set your nanny's working hours",
            body: "You're not using the nanny agreement, so tell us the days and hours that suit your family. They fill in your weekly schedule, and you can change them any time.",
            cta: "Add working hours",
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
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Next step</p>
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

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, CalendarClock, Clock3, ReceiptText } from "lucide-react";

import { ActionRow, CountBadge } from "@/components/dashboard/tiles";
import { getHubSummary } from "@/lib/family.functions";
import { reviewRows, weeklyScheduled } from "@/lib/calendar-overview";
import { useT } from "@/lib/i18n/provider";

/** The top of the Calendar tab: what is waiting for a decision, and how many hours the regular week covers. */
export function CalendarOverview({ slug }: { slug: string }) {
  const t = useT();
  const hubFn = useServerFn(getHubSummary);
  const query = useQuery({
    queryKey: ["hub-summary", slug],
    queryFn: () => hubFn({ data: { slug } }),
  });
  const hub = query.data;
  if (!hub) return null;

  const isNanny = hub.access === "nanny";
  const mine = hub.schedules.find((s) => s.nannyId === hub.nannyId) ?? hub.schedules[0];
  const week = weeklyScheduled(
    isNanny ? mine?.workingDays : hub.schedules.flatMap((s) => s.workingDays),
  );
  const rows = reviewRows(hub.attention);

  const rowFor = {
    hours: {
      to: "/timesheets/$slug" as const,
      icon: Clock3,
      title: isNanny ? t("nd.hoursAwaitingApproval") : t("dash.timesheetsToApprove"),
    },
    leave: {
      to: "/leave/$slug" as const,
      icon: CalendarCheck,
      title: isNanny ? t("nd.leaveAwaitingApproval") : t("dash.leaveRequests"),
    },
    expenses: {
      to: "/handover/$slug" as const,
      icon: ReceiptText,
      title: isNanny ? t("nd.expensesToBeRepaid") : t("dash.expensesToReimburse"),
    },
  };

  return (
    <div className="mb-8 space-y-6">
      <section>
        <h2 className="mb-2 text-[0.8125rem] font-medium text-muted-foreground">
          {t("cal.waiting")}
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("cal.allClear")}</p>
        ) : (
          <div className="ios-group">
            {rows.map((row) => (
              <ActionRow
                key={row.key}
                slug={slug}
                to={rowFor[row.key].to}
                icon={rowFor[row.key].icon}
                title={rowFor[row.key].title}
                tone="attention"
                badge={<CountBadge count={row.count} />}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[0.8125rem] font-medium text-muted-foreground">
          {t("cal.regularWeek")}
        </h2>
        <div className="ios-group">
          <ActionRow
            slug={slug}
            to="/hours/$slug"
            icon={CalendarClock}
            title={
              week.days
                ? t("cal.weekValue", { hours: week.hours, days: week.days })
                : t("cal.noHoursYet")
            }
            detail={isNanny ? undefined : t("cal.editHours")}
          />
        </div>
      </section>
    </div>
  );
}

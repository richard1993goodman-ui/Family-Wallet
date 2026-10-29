import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";

import { getWeeklyReport } from "@/lib/weekly-report.functions";
import { Card, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/report/$slug")({
  head: () => ({
    meta: [
      { title: "Friday Weekly Report — The Family Wallet" },
      { name: "description", content: "A polished weekly recap of hours, handovers, activities, sports progress and expenses from your Family Wallet." },
      { property: "og:title", content: "Friday Weekly Report — The Family Wallet" },
      { property: "og:description", content: "Your family's week at a glance, ready to review or print." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportPage,
});

const fmt = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const shiftWeek = (d: string, days: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);

function ReportPage() {
  const { slug } = Route.useParams();
  const fetchReport = useServerFn(getWeeklyReport);
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-report", slug, anchor ?? "this"],
    queryFn: () => fetchReport({ data: { slug, anchor } }),
  });

  if (isLoading) return <HubPage slug={slug} title="Friday Weekly Report"><p className="text-sm text-muted-foreground">Preparing your week…</p></HubPage>;
  if (!data) return <HubPage slug={slug} title="Friday Weekly Report"><LockedNotice slug={slug} /></HubPage>;

  const s = data.stats;
  const Empty = ({ text }: { text: string }) => <p className="text-sm text-muted-foreground">{text}</p>;

  return (
    <HubPage slug={slug} title="Friday Weekly Report" intro={`The ${data.familyName} family · ${fmt(data.week.start)} – ${fmt(data.week.end)}`}>
      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setAnchor(shiftWeek(data.week.start, -7))}><ChevronLeft className="h-4 w-4" /> Previous week</Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(shiftWeek(data.week.start, 7))}>Next week <ChevronRight className="h-4 w-4" /></Button>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / save PDF</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Hours worked", s.hours.toFixed(1)],
          ["Active minutes", String(s.activeMinutes)],
          ["Handovers", String(s.handovers)],
          ["Expenses", `£${s.expensesTotal.toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="heading-display mt-1 text-2xl text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <Card>
          <h2 className="heading-display text-lg text-foreground">Hours &amp; pay</h2>
          {data.shifts.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {data.shifts.map((sh, i) => (
                <li key={i} className="flex justify-between gap-2"><span>{fmt(sh.shift_date)} · {sh.start_time.slice(0, 5)}–{sh.end_time.slice(0, 5)}{sh.shift_type === "babysitting" ? " · Babysitting" : ""}</span><span className="text-muted-foreground">{sh.hours.toFixed(1)}h · {sh.status}</span></li>
              ))}
              <li className="border-t border-border pt-2 font-medium">Approved nanny pay £{s.approvedPay.toFixed(2)}{s.pendingShifts ? ` · ${s.pendingShifts} shift(s) awaiting approval` : ""}</li>
              {s.babysittingHours > 0 && <li className="font-medium">Babysitting: {s.babysittingHours.toFixed(1)}h · approved £{s.babysittingPay.toFixed(2)}</li>}
            </ul>
          ) : <Empty text="No timesheet shifts logged this week." />}
        </Card>

        <Card>
          <h2 className="heading-display text-lg text-foreground">Active Kids highlights</h2>
          {data.passport.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {data.passport.map((p, i) => (
                <li key={i}>{fmt(p.entry_date)} · <strong>{p.child_name}</strong> — {p.activity} ({p.minutes} min){p.badge ? ` · 🏅 ${p.badge}` : ""}</li>
              ))}
            </ul>
          ) : <Empty text="No sports passport entries this week." />}
        </Card>

        <Card>
          <h2 className="heading-display text-lg text-foreground">Daily handovers</h2>
          {data.handovers.length || data.logs.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {data.handovers.map((h, i) => (
                <li key={`h${i}`}><strong>{fmt(h.handover_date)}</strong> — Mood: {h.mood || "—"} · Energy: {h.energy || "—"} · Homework: {h.homework_status || "—"} · Dinner: {h.dinner_status || "—"}{h.tomorrow_notes ? <span className="block text-muted-foreground">Next: {h.tomorrow_notes}</span> : null}</li>
              ))}
              {data.logs.map((l, i) => (
                <li key={`l${i}`}><strong>{fmt(l.log_date)}</strong> — {[l.activities, l.notes].filter(Boolean).join(" · ") || "Daily log added"}</li>
              ))}
            </ul>
          ) : <Empty text="No handovers or daily logs this week." />}
        </Card>

        <Card>
          <h2 className="heading-display text-lg text-foreground">Planner &amp; leave</h2>
          {data.planner.length || data.leave.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {data.planner.map((p, i) => (
                <li key={i}>{fmt(p.entry_date)}{p.time_label ? ` ${p.time_label}` : ""} · {p.title}{p.child_name ? ` (${p.child_name})` : ""}</li>
              ))}
              {data.leave.map((l, i) => (
                <li key={`lv${i}`}>Leave: {fmt(l.start_date)}–{fmt(l.end_date)} · {l.days} day(s) · {l.status}</li>
              ))}
            </ul>
          ) : <Empty text="Nothing on the planner this week." />}
        </Card>

        <Card>
          <h2 className="heading-display text-lg text-foreground">Medication &amp; expenses</h2>
          {data.medication.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {data.medication.map((m, i) => (
                <li key={i}>{fmt(m.given_at)} · {m.child_name}: {m.medicine} {m.dose} — given by {m.given_by_name}</li>
              ))}
            </ul>
          ) : <Empty text="No medication given this week." />}
          {data.expenses.length ? (
            <ul className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
              {data.expenses.map((e, i) => (
                <li key={i} className="flex justify-between"><span>{fmt(e.expense_date)} · {e.item}</span><span className="text-muted-foreground">£{Number(e.amount).toFixed(2)} · {e.status}</span></li>
              ))}
              {s.expensesPending > 0 && <li className="font-medium">£{s.expensesPending.toFixed(2)} awaiting reimbursement</li>}
            </ul>
          ) : null}
        </Card>
      </div>
    </HubPage>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Clock3, MoonStar, X } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getTimesheets, reviewShiftFn, submitShiftFn } from "@/lib/work-tools.functions";
import { isBabysitting, shiftAmount, shiftHours, shiftTotals, type ShiftInput, type ShiftType } from "@/lib/work-tools.model";

export const Route = createFileRoute("/timesheets/$slug")({
  head: () => ({ meta: [
    { title: "Timesheets — Family Wallet" },
    { name: "description", content: "Record nanny shifts and babysitting, and review payment in the private Family Wallet." },
    { property: "og:title", content: "Timesheets — Family Wallet" },
    { property: "og:description", content: "Record and approve nanny shifts and babysitting." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: TimesheetsPage,
});

const freshShift = (shiftType: ShiftType = "nanny"): ShiftInput => ({
  shiftDate: new Date().toISOString().slice(0, 10),
  startTime: shiftType === "babysitting" ? "18:30" : "15:00",
  endTime: shiftType === "babysitting" ? "23:00" : "19:00",
  breakMinutes: 0,
  isOvernight: false,
  hourlyRate: 0,
  notes: "",
  shiftType,
});

type ShiftRow = ShiftInput & { id: string; status: string };

function TimesheetsPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getTimesheets);
  const submitFn = useServerFn(submitShiftFn);
  const reviewFn = useServerFn(reviewShiftFn);
  const [draft, setDraft] = useState<ShiftInput>(freshShift);
  const query = useQuery({ queryKey: ["timesheets", slug], queryFn: () => loadFn({ data: { slug } }) });
  if (query.isLoading) return <PageLoading />;
  if (!query.data) return <LockedNotice slug={slug} />;
  const isFamily = query.data.access === "family";
  const mapped: ShiftRow[] = query.data.shifts.map((s) => ({
    id: s.id,
    status: s.status,
    shiftDate: s.shift_date,
    startTime: s.start_time,
    endTime: s.end_time,
    breakMinutes: s.break_minutes,
    isOvernight: s.is_overnight,
    hourlyRate: Number(s.hourly_rate),
    notes: s.notes ?? "",
    shiftType: (s.shift_type === "babysitting" ? "babysitting" : "nanny") as ShiftType,
  }));
  const nannyShifts = mapped.filter((s) => !isBabysitting(s));
  const babysittingShifts = mapped.filter((s) => isBabysitting(s));
  const refresh = () => client.invalidateQueries({ queryKey: ["timesheets", slug] });

  const review = async (id: string, status: "approved" | "declined") => {
    await reviewFn({ data: { slug, id, status } });
    await refresh();
  };

  return <HubPage slug={slug} title="Timesheets" intro="Record worked shifts here. Babysitting (evenings and one-off sits) is kept separate from day-to-day nannying. Parents approve payment; nannies can always see its status.">
    <div className="mt-6"><Card>
      <h2 className="heading-display text-lg text-foreground">Add a worked shift</h2>
      <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="Shift type">
        {(["nanny", "babysitting"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setDraft({ ...freshShift(kind), hourlyRate: draft.hourlyRate })}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${draft.shiftType === kind ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"}`}
          >
            {kind === "babysitting" ? <MoonStar className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            {kind === "babysitting" ? "Babysitting" : "Nanny shift"}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Date" type="date" value={draft.shiftDate} onChange={(shiftDate) => setDraft({ ...draft, shiftDate })} />
        <Field label="Hourly rate (£)" type="number" value={String(draft.hourlyRate || "")} onChange={(v) => setDraft({ ...draft, hourlyRate: Number(v) })} />
        <Field label="Start" type="time" value={draft.startTime} onChange={(startTime) => setDraft({ ...draft, startTime })} />
        <Field label="Finish" type="time" value={draft.endTime} onChange={(endTime) => setDraft({ ...draft, endTime })} />
        <Field label="Unpaid break (minutes)" type="number" value={String(draft.breakMinutes)} onChange={(v) => setDraft({ ...draft, breakMinutes: Number(v) })} />
        <label className="flex items-end gap-2 pb-2 text-sm text-foreground"><input type="checkbox" checked={draft.isOvernight} onChange={(e) => setDraft({ ...draft, isOvernight: e.target.checked })} /> Overnight shift</label>
      </div>
      <div className="mt-4"><Field label="Notes" textarea value={draft.notes ?? ""} onChange={(notes) => setDraft({ ...draft, notes })} /></div>
      <p className="mt-3 text-sm text-muted-foreground">{shiftHours(draft).toFixed(2)} hours · £{shiftAmount(draft).toFixed(2)}</p>
      <Button className="mt-4" onClick={async () => {
        await submitFn({ data: { slug, shift: draft } });
        setDraft(freshShift(draft.shiftType));
        await refresh();
        toast.success(isFamily ? "Shift added and approved" : "Shift sent for approval");
      }}><Clock3 className="h-4 w-4" /> Add {draft.shiftType === "babysitting" ? "babysitting" : "shift"}</Button>
    </Card></div>

    <ShiftSection title="Nanny shifts" empty="No nanny shifts recorded yet." shifts={nannyShifts} isFamily={isFamily} onReview={review} />
    <ShiftSection title="Babysitting" empty="No babysitting recorded yet." shifts={babysittingShifts} isFamily={isFamily} onReview={review} />
  </HubPage>;
}

function ShiftSection({ title, empty, shifts, isFamily, onReview }: {
  title: string;
  empty: string;
  shifts: ShiftRow[];
  isFamily: boolean;
  onReview: (id: string, status: "approved" | "declined") => Promise<void>;
}) {
  const pending = shifts.filter((s) => s.status === "pending");
  const approved = shifts.filter((s) => s.status === "approved");
  return (
    <section className="mt-8">
      <h2 className="heading-display text-xl text-foreground">{title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Summary label="Awaiting approval" {...shiftTotals(pending)} />
        <Summary label="Approved" {...shiftTotals(approved)} />
      </div>
      <div className="mt-3 space-y-3">
        {shifts.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
        {shifts.map((shift) => (
          <Card key={shift.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{new Date(`${shift.shiftDate}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</p>
                <p className="mt-1 text-sm text-muted-foreground">{shift.startTime}–{shift.endTime} · {shiftHours(shift).toFixed(2)} hrs · £{shiftAmount(shift).toFixed(2)}</p>
                {shift.notes && <p className="mt-1 text-sm text-muted-foreground">{shift.notes}</p>}
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">{shift.status}</span>
            </div>
            {isFamily && shift.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => onReview(shift.id, "approved")}><Check className="h-4 w-4" /> Approve payment</Button>
                <Button size="sm" variant="outline" onClick={() => onReview(shift.id, "declined")}><X className="h-4 w-4" /> Decline</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

function Summary({ label, hours, amount }: { label: string; hours: number; amount: number }) {
  return <Card><p className="text-[0.8125rem] font-medium text-muted-foreground">{label}</p><p className="heading-display mt-2 text-2xl text-foreground">£{amount.toFixed(2)}</p><p className="text-sm text-muted-foreground">{hours.toFixed(2)} hours</p></Card>;
}

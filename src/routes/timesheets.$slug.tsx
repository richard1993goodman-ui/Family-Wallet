import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Clock3, X } from "lucide-react";
import { toast } from "sonner";

import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { getTimesheets, reviewShiftFn, submitShiftFn } from "@/lib/work-tools.functions";
import { shiftAmount, shiftHours, type ShiftInput } from "@/lib/work-tools.model";

export const Route = createFileRoute("/timesheets/$slug")({
  head: () => ({ meta: [
    { title: "Timesheets — Athlete Mannies & Nannies" },
    { name: "description", content: "Record nanny shifts and review payment in the private Family Vault." },
    { property: "og:title", content: "Timesheets — Athlete Mannies & Nannies" },
    { property: "og:description", content: "Record and approve nanny shifts." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: TimesheetsPage,
});

const freshShift = (): ShiftInput => ({ shiftDate: new Date().toISOString().slice(0, 10), startTime: "15:00", endTime: "19:00", breakMinutes: 0, isOvernight: false, hourlyRate: 0, notes: "" });

function TimesheetsPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const loadFn = useServerFn(getTimesheets);
  const submitFn = useServerFn(submitShiftFn);
  const reviewFn = useServerFn(reviewShiftFn);
  const [draft, setDraft] = useState(freshShift);
  const query = useQuery({ queryKey: ["timesheets", slug], queryFn: () => loadFn({ data: { slug } }) });
  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-sand text-sm text-muted-foreground">Loading…</div>;
  if (!query.data) return <LockedNotice slug={slug} />;
  const shifts = query.data.shifts;
  const mapped = shifts.map((s) => ({ ...s, shiftDate: s.shift_date, startTime: s.start_time, endTime: s.end_time, breakMinutes: s.break_minutes, isOvernight: s.is_overnight, hourlyRate: Number(s.hourly_rate), notes: s.notes ?? "" }));
  const pending = mapped.filter((s) => s.status === "pending");
  const approved = mapped.filter((s) => s.status === "approved");
  const totals = (items: typeof mapped) => ({ hours: items.reduce((sum, s) => sum + shiftHours(s), 0), amount: items.reduce((sum, s) => sum + shiftAmount(s), 0) });
  const refresh = () => client.invalidateQueries({ queryKey: ["timesheets", slug] });
  return <HubPage slug={slug} title="Timesheets" intro="Record each worked shift here. Parents approve payment; nannies can always see its status.">
    <div className="grid gap-3 sm:grid-cols-2"><Summary label="Awaiting approval" {...totals(pending)} /><Summary label="Approved" {...totals(approved)} /></div>
    <div className="mt-6"><Card><h2 className="heading-display text-lg text-foreground">Add a worked shift</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Date" type="date" value={draft.shiftDate} onChange={(shiftDate) => setDraft({ ...draft, shiftDate })} /><Field label="Hourly rate (£)" type="number" value={String(draft.hourlyRate || "")} onChange={(v) => setDraft({ ...draft, hourlyRate: Number(v) })} /><Field label="Start" type="time" value={draft.startTime} onChange={(startTime) => setDraft({ ...draft, startTime })} /><Field label="Finish" type="time" value={draft.endTime} onChange={(endTime) => setDraft({ ...draft, endTime })} /><Field label="Unpaid break (minutes)" type="number" value={String(draft.breakMinutes)} onChange={(v) => setDraft({ ...draft, breakMinutes: Number(v) })} /><label className="flex items-end gap-2 pb-2 text-sm text-foreground"><input type="checkbox" checked={draft.isOvernight} onChange={(e) => setDraft({ ...draft, isOvernight: e.target.checked })} /> Overnight shift</label></div><div className="mt-4"><Field label="Notes" textarea value={draft.notes ?? ""} onChange={(notes) => setDraft({ ...draft, notes })} /></div><p className="mt-3 text-sm text-muted-foreground">{shiftHours(draft).toFixed(2)} hours · £{shiftAmount(draft).toFixed(2)}</p><Button className="mt-4" onClick={async () => { await submitFn({ data: { slug, shift: draft } }); setDraft(freshShift()); await refresh(); toast.success(query.data?.access === "nanny" ? "Shift sent for approval" : "Shift added and approved"); }}><Clock3 className="h-4 w-4" /> Add shift</Button></Card></div>
    <h2 className="heading-display mt-8 text-xl text-foreground">Shift history</h2><div className="mt-3 space-y-3">{mapped.length === 0 && <p className="text-sm text-muted-foreground">No shifts recorded yet.</p>}{mapped.map((shift) => <Card key={shift.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-foreground">{new Date(`${shift.shiftDate}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</p><p className="mt-1 text-sm text-muted-foreground">{shift.startTime}–{shift.endTime} · {shiftHours(shift).toFixed(2)} hrs · £{shiftAmount(shift).toFixed(2)}</p>{shift.notes && <p className="mt-1 text-sm text-muted-foreground">{shift.notes}</p>}</div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-foreground">{shift.status}</span></div>{query.data?.access === "family" && shift.status === "pending" && <div className="mt-4 flex gap-2"><Button size="sm" onClick={async () => { await reviewFn({ data: { slug, id: shift.id, status: "approved" } }); await refresh(); }}><Check className="h-4 w-4" /> Approve payment</Button><Button size="sm" variant="outline" onClick={async () => { await reviewFn({ data: { slug, id: shift.id, status: "declined" } }); await refresh(); }}><X className="h-4 w-4" /> Decline</Button></div>}</Card>)}</div>
  </HubPage>;
}

function Summary({ label, hours, amount }: { label: string; hours: number; amount: number }) { return <Card><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="heading-display mt-2 text-2xl text-foreground">£{amount.toFixed(2)}</p><p className="text-sm text-muted-foreground">{hours.toFixed(2)} hours</p></Card>; }

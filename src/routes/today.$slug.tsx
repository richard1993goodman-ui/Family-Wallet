import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Baby, Milk, Moon, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";

import { Card, EmptyState, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import {
  addCareEventFn,
  deleteCareEventFn,
  endNapFn,
  getCareEvents,
} from "@/lib/care-events.functions";
import { CARE_LABELS, dayTotals, napMinutes, type CareEventInput, type CareEventRow } from "@/lib/care-events.types";

export const Route = createFileRoute("/today/$slug")({
  head: () => ({
    meta: [
      { title: "Today — The Family Wallet" },
      { name: "description", content: "Quick-tap naps, bottles, meals and nappies, shared between family and nanny." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TodayPage,
});

const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD in the viewer's zone
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const hm = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);

function describe(e: CareEventRow) {
  const who = e.childName ? ` · ${e.childName}` : "";
  if (e.kind === "nap") {
    return e.endedAt ? `Nap ${clock(e.startedAt)}–${clock(e.endedAt)} (${hm(napMinutes(e))})${who}` : `Asleep since ${clock(e.startedAt)}${who}`;
  }
  const extra = e.kind === "bottle" ? ` ${e.amountMl}ml` : e.detail ? ` (${e.detail})` : "";
  return `${CARE_LABELS[e.kind]}${extra} at ${clock(e.startedAt)}${who}`;
}

function TodayPage() {
  const { slug } = Route.useParams();
  const client = useQueryClient();
  const load = useServerFn(getCareEvents);
  const add = useServerFn(addCareEventFn);
  const endNap = useServerFn(endNapFn);
  const remove = useServerFn(deleteCareEventFn);
  const query = useQuery({ queryKey: ["care-events", slug], queryFn: () => load({ data: { slug } }), refetchInterval: 60_000 });

  const [childId, setChildId] = useState("");
  const [ml, setMl] = useState("120");
  const [busy, setBusy] = useState(false);

  if (query.isLoading) return <PageLoading />;
  if (!query.data) return <LockedNotice slug={slug} />;
  const data = query.data;

  const run = async (job: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await job();
      await client.invalidateQueries({ queryKey: ["care-events", slug] });
      if (done) toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setBusy(false);
    }
  };
  const log = (event: CareEventInput, done: string) =>
    run(() => add({ data: { slug, event: { ...event, childId: childId || undefined } } }), done);

  const sleeping = data.events.find((e) => e.kind === "nap" && !e.endedAt && (!childId || e.childId === childId || !e.childId));
  const today = localDay(new Date().toISOString());
  const todayEvents = data.events.filter((e) => localDay(e.startedAt) === today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-CA");
  });
  const totals = days.map((d) => ({ d, ...dayTotals(data.events, d, localDay) }));
  const maxNap = Math.max(60, ...totals.map((t) => t.napMins));
  const maxMl = Math.max(100, ...totals.map((t) => t.bottleMl));
  const canDelete = (e: CareEventRow) => data.access === "family" || e.addedBy === data.access;

  return (
    <HubPage slug={slug} title="Today" intro="Tap to log naps, bottles, meals and nappies. Everyone in the household sees it straight away.">
      {data.children.length > 1 && (
        <label className="mb-4 block">
          <span className="text-sm font-medium text-foreground">Who is this for?</span>
          <select value={childId} onChange={(e) => setChildId(e.target.value)} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">All of the children</option>
            {data.children.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </label>
      )}

      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sleeping ? (
            <Button disabled={busy} onClick={() => run(() => endNap({ data: { slug, id: sleeping.id } }), "Nap ended")} className="h-16 flex-col gap-1">
              <Moon className="h-5 w-5" /> Woke up
            </Button>
          ) : (
            <Button disabled={busy} variant="outline" onClick={() => log({ kind: "nap" }, "Nap started")} className="h-16 flex-col gap-1">
              <Moon className="h-5 w-5" /> Start nap
            </Button>
          )}
          <Button disabled={busy} variant="outline" onClick={() => log({ kind: "meal" }, "Meal logged")} className="h-16 flex-col gap-1">
            <Utensils className="h-5 w-5" /> Meal
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => log({ kind: "nappy", detail: "wet" }, "Wet nappy logged")} className="h-16 flex-col gap-1">
            <Baby className="h-5 w-5" /> Wet nappy
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => log({ kind: "nappy", detail: "dirty" }, "Dirty nappy logged")} className="h-16 flex-col gap-1">
            <Baby className="h-5 w-5" /> Dirty nappy
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Bottle (ml)</span>
            <input type="number" inputMode="numeric" min={1} max={1000} value={ml} onChange={(e) => setMl(e.target.value)} className="mt-1.5 w-28 rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <Button disabled={busy} variant="outline" onClick={() => log({ kind: "bottle", amountMl: Number(ml) }, "Bottle logged")}>
            <Milk className="mr-2 h-4 w-4" /> Log bottle
          </Button>
          <Button disabled={busy} variant="ghost" onClick={() => log({ kind: "potty" }, "Potty logged")}>Potty</Button>
        </div>
      </Card>

      <h2 className="heading-display mt-8 text-lg text-foreground">Last 7 days</h2>
      <Card>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
          {totals.map((t) => (
            <div key={t.d}>
              <div className="flex h-20 items-end justify-center gap-1" aria-hidden>
                <div className="w-3 rounded-t bg-primary/70" style={{ height: `${(t.napMins / maxNap) * 100}%` }} />
                <div className="w-3 rounded-t bg-accent-foreground/40" style={{ height: `${(t.bottleMl / maxMl) * 100}%` }} />
              </div>
              <div className="mt-1">{new Date(t.d).toLocaleDateString("en-GB", { weekday: "short" })}</div>
              <div className="sr-only">{`${hm(t.napMins)} napping, ${t.bottleMl}ml of milk, ${t.nappies} nappy or potty changes`}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Dark bars: nap time. Light bars: milk. Today so far: {hm(totals[6]!.napMins)} napping, {totals[6]!.bottleMl}ml milk, {totals[6]!.nappies} nappy or potty changes.</p>
      </Card>

      <h2 className="heading-display mt-8 text-lg text-foreground">Today</h2>
      {todayEvents.length === 0 ? (
        <EmptyState title="Nothing logged yet" description="Tap a button above and it shows up here for everyone." />
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
          {todayEvents.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>{describe(e)}</span>
              {canDelete(e) && (
                <button aria-label="Remove entry" disabled={busy} onClick={() => run(() => remove({ data: { slug, id: e.id } }))} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </HubPage>
  );
}

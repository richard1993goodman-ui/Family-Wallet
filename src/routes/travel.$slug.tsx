import { formatDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plane, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { addTravelNoteFn, deleteTripFn, getTravel, saveTripFn, updateChecklistFn } from "@/lib/travel.functions";
import { TRAVEL_NOTE_CATEGORIES, type TripInput } from "@/lib/travel.types";
import { Card, Field, HubPage, LockedNotice } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/travel/$slug")({
  head: () => ({
    meta: [
      { title: "Travel & Villa Nanny Pack — Family Wallet" },
      { name: "description", content: "Travel mode for families abroad: a packing and safety checklist, local emergency details and travel handover notes." },
      { property: "og:title", content: "Travel & Villa Nanny Pack — Family Wallet" },
      { property: "og:description", content: "Checklist, local emergency info and travel handovers for trips abroad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TravelPage,
});

const fmt = (d: string) =>
  formatDate(`${d.length > 10 ? d : `${d}T00:00:00Z`}`, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const emptyTrip: TripInput = { destination: "", startDate: "", endDate: "", accommodation: "", localEmergency: "", nearestHospital: "", timeDifference: "", travelPay: "", notes: "" };

function TravelPage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const fetchTravel = useServerFn(getTravel);
  const save = useServerFn(saveTripFn);
  const checklist = useServerFn(updateChecklistFn);
  const addNote = useServerFn(addTravelNoteFn);
  const del = useServerFn(deleteTripFn);
  const { data, isLoading } = useQuery({ queryKey: ["travel", slug], queryFn: () => fetchTravel({ data: { slug } }) });

  const [form, setForm] = useState<TripInput | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState({ category: "general", text: "" });
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["travel", slug] });
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); await refresh(); if (ok) toast.success(ok); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  if (isLoading) return <HubPage slug={slug} title="Travel & Villa Nanny Pack"><p className="text-sm text-muted-foreground">Loading…</p></HubPage>;
  if (!data) return <HubPage slug={slug} title="Travel & Villa Nanny Pack"><LockedNotice slug={slug} /></HubPage>;

  const isParent = data.access === "family";
  const trip = data.trips.find((t) => t.id === selectedId) ?? data.active ?? data.upcoming ?? data.trips[0] ?? null;
  const setV = (k: keyof TripInput) => (v: string) => setForm((f) => ({ ...(f ?? emptyTrip), [k]: v }));

  return (
    <HubPage slug={slug} title="Travel & Villa Nanny Pack" intro="Going abroad? Add your trip and the wallet switches to travel mode — checklist, local emergency details and travel handover notes in one place.">
      {data.trips.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {data.trips.map((t) => (
            <Button key={t.id} size="sm" variant={trip?.id === t.id ? "default" : "outline"} onClick={() => setSelectedId(t.id)}>{t.destination}</Button>
          ))}
        </div>
      )}

      {isParent && !form && (
        <div className="mb-5 flex gap-2">
          <Button onClick={() => setForm({ ...emptyTrip })}><Plus className="h-4 w-4" /> Add a trip</Button>
          {trip && <Button variant="outline" onClick={() => setForm({ id: trip.id, destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate, accommodation: trip.accommodation ?? "", localEmergency: trip.localEmergency ?? "", nearestHospital: trip.nearestHospital ?? "", timeDifference: trip.timeDifference ?? "", travelPay: trip.travelPay ?? "", notes: trip.notes ?? "" })}>Edit trip details</Button>}
        </div>
      )}

      {form && (
        <Card>
          <h2 className="heading-display text-lg text-foreground">{form.id ? "Edit trip" : "New trip"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Destination" value={form.destination ?? ""} onChange={setV("destination")} placeholder="e.g. Villa in Mallorca" />
            <Field label="Time difference" value={form.timeDifference ?? ""} onChange={setV("timeDifference")} placeholder="+1 hour" />
            <Field label="Leave date" value={form.startDate ?? ""} onChange={setV("startDate")} type="date" />
            <Field label="Return date" value={form.endDate ?? ""} onChange={setV("endDate")} type="date" />
            <Field label="Local emergency number" value={form.localEmergency ?? ""} onChange={setV("localEmergency")} placeholder="112" />
            <Field label="Nearest hospital / clinic" value={form.nearestHospital ?? ""} onChange={setV("nearestHospital")} />
          </div>
          <div className="mt-3 grid gap-3">
            <Field label="Accommodation address & Wi-Fi" value={form.accommodation ?? ""} onChange={setV("accommodation")} textarea />
            <Field label="Travel pay, days off & nanny room" value={form.travelPay ?? ""} onChange={setV("travelPay")} textarea placeholder="e.g. £180/day, 1 day off per week, own room" />
            <Field label="Notes for the nanny" value={form.notes ?? ""} onChange={setV("notes")} textarea />
          </div>
          <div className="mt-4 flex gap-2">
            <Button disabled={busy} onClick={() => run(async () => { const r = await save({ data: { slug, trip: form } }); setSelectedId(r.id); setForm(null); }, "Trip saved")}>Save trip</Button>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {!trip && !form && <Card><p className="text-sm text-muted-foreground">{isParent ? "No trips yet. Add one to switch your wallet into travel mode while you're away." : "No trips have been added yet."}</p></Card>}

      {trip && !form && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
            <p className="flex items-center gap-2 text-[0.8125rem] font-medium opacity-80"><Plane className="h-4 w-4" />{trip.startDate <= data.today && trip.endDate >= data.today ? "Travel mode is on" : trip.startDate > data.today ? "Upcoming trip" : "Past trip"}</p>
            <p className="heading-display mt-1 text-2xl">{trip.destination}</p>
            <p className="mt-1 text-sm opacity-90">{fmt(trip.startDate)} – {fmt(trip.endDate)}{trip.timeDifference ? ` · ${trip.timeDifference}` : ""}</p>
          </div>

          <Card>
            <h2 className="heading-display text-lg text-foreground">Abroad essentials</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              {[["Local emergency", trip.localEmergency], ["Nearest hospital", trip.nearestHospital], ["Accommodation", trip.accommodation], ["Travel pay & days off", trip.travelPay], ["Notes", trip.notes]].map(([k, v]) => v ? <div key={k}><dt className="font-medium text-foreground">{k}</dt><dd className="whitespace-pre-line text-muted-foreground">{v}</dd></div> : null)}
            </dl>
          </Card>

          <Card>
            <h2 className="heading-display text-lg text-foreground">Travel checklist <span className="text-sm text-muted-foreground">{trip.checklist.filter((i) => i.done).length}/{trip.checklist.length}</span></h2>
            <ul className="mt-2 space-y-1.5">
              {trip.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={item.done} disabled={busy} onChange={() => run(() => checklist({ data: { slug, tripId: trip.id, action: { type: "toggle", itemId: item.id } } }))} />
                  <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                  <button className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove item" onClick={() => run(() => checklist({ data: { slug, tripId: trip.id, action: { type: "remove", itemId: item.id } } }))}><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item" />
              <Button variant="outline" disabled={!newItem.trim() || busy} onClick={() => run(async () => { await checklist({ data: { slug, tripId: trip.id, action: { type: "add", label: newItem } } }); setNewItem(""); })}>Add</Button>
            </div>
          </Card>

          <Card>
            <h2 className="heading-display text-lg text-foreground">Travel handover notes</h2>
            <p className="text-sm text-muted-foreground">Pool time, sun cream, naps and jet lag, what they ate, tomorrow's plan.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRAVEL_NOTE_CATEGORIES.map((c) => (
                <Button key={c.value} size="sm" variant={note.category === c.value ? "default" : "outline"} onClick={() => setNote((n) => ({ ...n, category: c.value }))}>{c.label}</Button>
              ))}
            </div>
            <Textarea className="mt-2" rows={3} value={note.text} onChange={(e) => setNote((n) => ({ ...n, text: e.target.value }))} placeholder="e.g. Both in the pool 10–11am with armbands, factor 50 reapplied at 12, nap 1:30–3" />
            <Button className="mt-2" disabled={!note.text.trim() || busy} onClick={() => run(async () => { await addNote({ data: { slug, tripId: trip.id, ...note } }); setNote((n) => ({ ...n, text: "" })); }, "Note added")}>Add note</Button>
            <ul className="mt-4 space-y-3">
              {trip.handoverNotes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{TRAVEL_NOTE_CATEGORIES.find((c) => c.value === n.category)?.label ?? "General"} · {n.authorName} ({n.authorRole === "nanny" ? "nanny" : "family"}) · {formatDate(n.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="mt-1 whitespace-pre-line">{n.text}</p>
                </li>
              ))}
            </ul>
          </Card>

          {isParent && (
            <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this trip?")) void run(async () => { await del({ data: { slug, tripId: trip.id } }); setSelectedId(null); }, "Trip deleted"); }}>
              <Trash2 className="h-4 w-4" /> Delete trip
            </Button>
          )}
        </div>
      )}
    </HubPage>
  );
}

import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { CalendarDays, CalendarClock, Camera, CheckCircle2, Clock3, Pill, Play, Receipt, Square, StickyNote, Utensils } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCareEventFn } from "@/lib/care-events.functions";
import { addPlannerEntryFn } from "@/lib/family.functions";
import { saveMomentPhotoFn } from "@/lib/moments.functions";
import { endShiftFn, getTodayFn, startShiftFn } from "@/lib/shift.functions";
import type { TimelineItem, TimelineKind } from "@/lib/today-timeline";

const ICONS: Record<TimelineKind, typeof Clock3> = {
  shift: Clock3,
  schedule: CalendarDays,
  routine: CalendarClock,
  logged: CheckCircle2,
  medicine: Pill,
  photo: Camera,
};

const hm = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;

/** Shrinks a phone photo to at most 1280px so it uploads quickly. */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("Couldn't read that photo.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** The shift as one timeline, with one-tap start and end and quick capture. */
export function TodayTimeline({ slug }: { slug: string }) {
  const client = useQueryClient();
  const todayFn = useServerFn(getTodayFn);
  const startFn = useServerFn(startShiftFn);
  const endFn = useServerFn(endShiftFn);
  const careFn = useServerFn(addCareEventFn);
  const plannerFn = useServerFn(addPlannerEntryFn);
  const photoFn = useServerFn(saveMomentPhotoFn);
  const query = useQuery({ queryKey: ["today", slug], queryFn: () => todayFn({ data: { slug } }), refetchInterval: 60_000 });

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [breakMins, setBreakMins] = useState("0");
  const [note, setNote] = useState<null | { type: "activity" | "note"; text: string }>(null);
  const [photo, setPhoto] = useState<null | { file: File; caption: string; child: string }>(null);

  const data = query.data;
  if (!data) return null;
  const isNanny = data.access === "nanny";
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["today", slug] }), client.invalidateQueries({ queryKey: ["expected-shifts", slug] }), client.invalidateQueries({ queryKey: ["timesheets", slug] })]);

  const run = async (job: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await job();
      await refresh();
      toast.success(done);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const log = (title: string, detail: string) =>
    run(() => careFn({ data: { slug, event: { kind: "meal", detail } } }), `${title} logged`);

  const sharePhoto = async () => {
    if (!photo) return;
    const ok = await run(async () => {
      const base64 = await shrink(photo.file);
      await photoFn({
        data: { slug, moment: { kind: "photo", momentDate: data.today, caption: photo.caption, childId: photo.child || undefined, fileName: "photo.jpg", contentType: "image/jpeg", base64 } },
      });
    }, "Photo shared");
    if (ok) {
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addNote = async () => {
    if (!note?.text.trim()) return;
    const ok = await run(
      () => plannerFn({ data: { slug, entryDate: data.today, timeLabel: data.now, title: note.text.trim(), entryType: note.type } }),
      note.type === "activity" ? "Activity added" : "Note added",
    );
    if (ok) setNote(null);
  };

  const status = data.shift
    ? data.shift.open
      ? `${isNanny ? "You're" : `${data.nannyName} is`} on shift since ${data.shift.startedAt}`
      : `Finished at ${data.shift.endedAt} · ${hm(data.shift.minutes)}`
    : data.scheduled
      ? `${isNanny ? "Your" : `${data.nannyName}'s`} shift is scheduled ${data.scheduled.start} to ${data.scheduled.end}`
      : `No shift scheduled today`;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.8125rem] font-medium text-muted-foreground">
              {new Date(`${data.today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            </p>
            <p className="heading-display mt-0.5 text-xl text-foreground">{status}</p>
            {data.shift && !data.shift.open && isNanny && (
              <p className="mt-1 text-sm text-muted-foreground">Sent to your timesheet for a parent to approve.</p>
            )}
          </div>
          {isNanny && !data.shift && (
            <Button size="lg" disabled={busy} onClick={() => void run(() => startFn({ data: { slug } }), "Shift started")}>
              <Play className="h-4 w-4" /> Start shift
            </Button>
          )}
          {isNanny && data.shift?.open && !ending && (
            <Button size="lg" variant="outline" disabled={busy} onClick={() => setEnding(true)}>
              <Square className="h-4 w-4" /> End shift
            </Button>
          )}
        </div>
        {ending && (
          <form
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => endFn({ data: { slug, breakMinutes: Number(breakMins) || 0 } }), "Shift finished and sent for approval").then((ok) => ok && setEnding(false));
            }}
          >
            <label className="block text-sm font-medium text-foreground">
              Unpaid break (minutes)
              <Input className="mt-1.5 w-32" type="number" min="0" max="720" value={breakMins} onChange={(e) => setBreakMins(e.target.value)} />
            </label>
            <Button type="submit" disabled={busy}>Finish and send hours</Button>
            <Button type="button" variant="ghost" onClick={() => setEnding(false)}>Cancel</Button>
          </form>
        )}
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Quick capture">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPhoto({ file, caption: "", child: "" });
          }}
        />
        <Chip icon={Camera} label="Photo" onClick={() => fileRef.current?.click()} />
        <Chip icon={Utensils} label="Snack" disabled={busy} onClick={() => void log("Snack", "Snack")} />
        <Chip icon={Utensils} label="Dinner" disabled={busy} onClick={() => void log("Dinner", "Dinner")} />
        <Chip icon={CalendarClock} label="Activity" onClick={() => setNote({ type: "activity", text: "" })} />
        <Chip icon={StickyNote} label="Note" onClick={() => setNote({ type: "note", text: "" })} />
        <ChipLink icon={Pill} label="Medicine" to="/medication/$slug" slug={slug} />
        <ChipLink icon={Receipt} label="Expense" to="/handover/$slug" slug={slug} />
      </div>

      {note && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addNote();
          }}
        >
          <Input
            autoFocus
            className="min-w-0 flex-1"
            placeholder={note.type === "activity" ? "What are you doing? e.g. Football at the park" : "A note for today"}
            value={note.text}
            onChange={(e) => setNote({ ...note, text: e.target.value })}
          />
          <Button type="submit" disabled={busy || !note.text.trim()}>Add</Button>
          <Button type="button" variant="ghost" onClick={() => setNote(null)}>Cancel</Button>
        </form>
      )}

      {photo && (
        <Card>
          <p className="text-sm font-medium text-foreground">Share this photo</p>
          <img src={URL.createObjectURL(photo.file)} alt="Preview" className="mt-3 max-h-56 rounded-xl object-cover" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input placeholder="Add a caption (optional)" value={photo.caption} onChange={(e) => setPhoto({ ...photo, caption: e.target.value })} />
            {data.children.length > 0 && (
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={photo.child}
                onChange={(e) => setPhoto({ ...photo, child: e.target.value })}
              >
                <option value="">All of the children</option>
                {data.children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={busy} onClick={() => void sharePhoto()}>Share</Button>
            <Button variant="ghost" onClick={() => setPhoto(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {data.summary && (
        <Card>
          <h2 className="heading-display text-lg text-foreground">End-of-day summary</h2>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {data.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="Timeline">
        {data.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet today. Start the shift and log things as they happen, and the day fills in here.</p>
        ) : (
          <ol className="relative space-y-1 border-l border-border pl-5">
            {data.timeline.map((item) => (
              <TimelineRow key={item.id} item={item} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const Icon = ICONS[item.kind];
  const next = item.state === "next";
  const upcoming = item.state === "upcoming";
  return (
    <li className="relative pb-3">
      <span
        className={`absolute -left-[1.85rem] top-1 grid h-5 w-5 place-items-center rounded-full ring-4 ring-background ${
          item.attention ? "bg-warning text-white" : next ? "bg-primary text-primary-foreground" : upcoming ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
        }`}
        aria-hidden
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className={`rounded-2xl p-3 ${next ? "bg-card shadow-sm ring-1 ring-primary/30" : ""}`}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="num text-sm font-semibold text-foreground">{item.at ?? "Today"}</span>
          <span className={`text-sm ${upcoming ? "text-muted-foreground" : "text-foreground"}`}>{item.title}</span>
          {next && <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">Next</span>}
          {item.attention && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-medium text-warning">Check</span>}
        </div>
        {(item.detail || item.childName) && (
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{[item.childName, item.detail].filter(Boolean).join(" · ")}</p>
        )}
        {item.photoUrl && <img src={item.photoUrl} alt={item.title} loading="lazy" className="mt-2 max-h-44 rounded-xl object-cover" />}
      </div>
    </li>
  );
}

const chipClass = "inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-accent disabled:opacity-50";

function Chip({ icon: Icon, label, onClick, disabled }: { icon: typeof Clock3; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={chipClass} onClick={onClick} disabled={disabled}>
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}

function ChipLink({ icon: Icon, label, to, slug }: { icon: typeof Clock3; label: string; to: "/medication/$slug" | "/handover/$slug"; slug: string }) {
  return (
    <Link to={to} params={{ slug }} className={chipClass}>
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
}

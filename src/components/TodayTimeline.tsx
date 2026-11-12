import { formatDate } from "@/lib/format";
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
import { useT } from "@/lib/i18n/provider";

const ICONS: Record<TimelineKind, typeof Clock3> = {
  shift: Clock3,
  schedule: CalendarDays,
  routine: CalendarClock,
  logged: CheckCircle2,
  medicine: Pill,
  photo: Camera,
};

/** Each kind of item has its own colour, so the day reads at a glance. */
const KIND_TINT: Record<TimelineKind, "sage" | "sky" | "lilac" | "butter" | "apricot"> = {
  shift: "sage",
  schedule: "sky",
  routine: "lilac",
  logged: "sage",
  medicine: "butter",
  photo: "apricot",
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
  const t = useT();
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

  const run = async (job: ()  => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await job();
      await refresh();
      toast.success(done);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tl.thatDidnTSave"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const log = (title: string, detail: string) =>
    run(() => careFn({ data: { slug, event: { kind: "meal", detail } } }), t("tl.logged", { title }));

  const sharePhoto = async () => {
    if (!photo) return;
    const ok = await run(async () => {
      const base64 = await shrink(photo.file);
      await photoFn({
        data: { slug, moment: { kind: "photo", momentDate: data.today, caption: photo.caption, childId: photo.child || undefined, fileName: "photo.jpg", contentType: "image/jpeg", base64 } },
      });
    }, t("tl.photoShared"));
    if (ok) {
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addNote = async () => {
    if (!note?.text.trim()) return;
    const ok = await run(
      () => plannerFn({ data: { slug, entryDate: data.today, timeLabel: data.now, title: note.text.trim(), entryType: note.type } }),
      note.type === "activity" ? t("tl.activityAdded") : t("tl.noteAdded"),
    );
    if (ok) setNote(null);
  };

  const status = data.shift
    ? data.shift.open
      ? isNanny
        ? t("tl.onShiftSinceYou", { time: data.shift.startedAt })
        : t("tl.onShiftSinceNamed", { name: data.nannyName ?? "", time: data.shift.startedAt })
      : t("tl.finishedAt", { time: data.shift.endedAt ?? "", duration: hm(data.shift.minutes) })
    : data.scheduled
      ? isNanny
        ? t("tl.scheduledYour", { start: data.scheduled.start, end: data.scheduled.end })
        : t("tl.scheduledNamed", { name: data.nannyName ?? "", start: data.scheduled.start, end: data.scheduled.end })
      : t("tl.noShiftToday");

  return (
    <div className="space-y-5">
      <div className="glass-hero rise p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="relative text-[0.8125rem] text-muted-foreground">
              {formatDate(`${data.today}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            </p>
            <p className="heading-display num relative mt-1 text-[1.625rem] leading-tight text-navy">{status}</p>
            {data.shift && !data.shift.open && isNanny && (
              <p className="relative mt-1 text-sm text-muted-foreground">{t("tl.sentToYourTimesheetFor")}</p>
            )}
          </div>
          {isNanny && !data.shift && (
            <Button size="lg" className="relative" disabled={busy} onClick={() => void run(() => startFn({ data: { slug } }), t("tl.shiftStarted"))}>
              <Play className="h-4 w-4" />{t("tl.startShift")}</Button>
          )}
          {isNanny && data.shift?.open && !ending && (
            <Button size="lg" variant="outline" className="relative" disabled={busy} onClick={() => setEnding(true)}>
              <Square className="h-4 w-4" />{t("tl.endShift")}</Button>
          )}
        </div>
        {ending && (
          <form
            className="relative mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => endFn({ data: { slug, breakMinutes: Number(breakMins) || 0 } }), t("tl.shiftFinishedAndSentFor")).then((ok) => ok && setEnding(false));
            }}
          >
            <label className="block text-sm font-medium text-foreground">{t("tl.unpaidBreakMinutes")}<Input className="mt-1.5 w-32" type="number" min="0" max="720" value={breakMins} onChange={(e) => setBreakMins(e.target.value)} />
            </label>
            <Button type="submit" disabled={busy}>{t("tl.finishAndSendHours")}</Button>
            <Button type="button" variant="ghost" onClick={() => setEnding(false)}>{t("tl.cancel")}</Button>
          </form>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("tl.quickCapture")}>
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
        <Chip icon={Camera} label={t("tl.photo")} onClick={() => fileRef.current?.click()} />
        <Chip icon={Utensils} label={t("tl.snack")} disabled={busy} onClick={() => void log("Snack", t("tl.snack"))} />
        <Chip icon={Utensils} label={t("tl.dinner")} disabled={busy} onClick={() => void log("Dinner", t("tl.dinner"))} />
        <Chip icon={CalendarClock} label={t("tl.activity")} onClick={() => setNote({ type: "activity", text: "" })} />
        <Chip icon={StickyNote} label={t("tl.note")} onClick={() => setNote({ type: "note", text: "" })} />
        <ChipLink icon={Pill} label={t("tl.medicine")} to="/medication/$slug" slug={slug} />
        <ChipLink icon={Receipt} label={t("tl.expense")} to="/handover/$slug" slug={slug} />
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
            placeholder={note.type === "activity" ? t("tl.whatAreYouDoingE") : t("tl.aNoteForToday")}
            value={note.text}
            onChange={(e) => setNote({ ...note, text: e.target.value })}
          />
          <Button type="submit" disabled={busy || !note.text.trim()}>{t("tl.add")}</Button>
          <Button type="button" variant="ghost" onClick={() => setNote(null)}>{t("tl.cancel")}</Button>
        </form>
      )}

      {photo && (
        <Card>
          <p className="text-sm font-medium text-foreground">{t("tl.shareThisPhoto")}</p>
          <img src={URL.createObjectURL(photo.file)} alt="Preview" className="mt-3 max-h-56 rounded-xl object-cover" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input placeholder={t("tl.addACaptionOptional")} value={photo.caption} onChange={(e) => setPhoto({ ...photo, caption: e.target.value })} />
            {data.children.length > 0 && (
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={photo.child}
                onChange={(e) => setPhoto({ ...photo, child: e.target.value })}
              >
                <option value="">{t("tl.allOfTheChildren")}</option>
                {data.children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={busy} onClick={() => void sharePhoto()}>{t("tl.share")}</Button>
            <Button variant="ghost" onClick={() => setPhoto(null)}>{t("tl.cancel")}</Button>
          </div>
        </Card>
      )}

      {data.summary && (
        <div data-tint="butter" className="tint-card rounded-2xl p-5">
          <h2 className="heading-display text-lg text-foreground">{t("tl.endOfDaySummary")}</h2>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {data.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <section aria-label={t("tl.timeline")}>
        {data.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tl.nothingYetTodayStartThe")}</p>
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
  const t = useT();
  const Icon = ICONS[item.kind];
  const next = item.state === "next";
  const upcoming = item.state === "upcoming";
  return (
    <li className="relative pb-3">
      <span
        data-tint={item.attention ? "rose" : KIND_TINT[item.kind]}
        className={`absolute -left-[1.95rem] top-0.5 grid h-6 w-6 place-items-center rounded-full ring-4 ring-background ${
          next ? "bg-primary text-primary-foreground" : upcoming ? "bg-muted text-muted-foreground" : "bg-[var(--tint-bg)] text-[var(--tint-fg)]"
        }`}
        aria-hidden
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className={`rounded-2xl p-3 ${next ? "bg-card shadow-sm ring-1 ring-primary/30" : ""}`}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="num text-sm font-semibold text-foreground">{item.at ?? "Today"}</span>
          <span className={`text-sm ${upcoming ? "text-muted-foreground" : "text-foreground"}`}>{item.title}</span>
          {next && <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">{t("tl.next")}</span>}
          {item.attention && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-medium text-warning">{t("tl.check")}</span>}
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

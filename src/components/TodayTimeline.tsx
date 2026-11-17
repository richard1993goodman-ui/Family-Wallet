import { formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  CalendarDays,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Pill,
  Play,
  Receipt,
  Square,
  StickyNote,
  Utensils,
} from "lucide-react";
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
/**
 * `home`: the Home screen shows only the latest few items and links to the whole day;
 * the Today page shows everything.
 */
export function TodayTimeline({ slug, home = false }: { slug: string; home?: boolean }) {
  const t = useT();
  const client = useQueryClient();
  const todayFn = useServerFn(getTodayFn);
  const startFn = useServerFn(startShiftFn);
  const endFn = useServerFn(endShiftFn);
  const careFn = useServerFn(addCareEventFn);
  const plannerFn = useServerFn(addPlannerEntryFn);
  const photoFn = useServerFn(saveMomentPhotoFn);
  const query = useQuery({
    queryKey: ["today", slug],
    queryFn: () => todayFn({ data: { slug } }),
    refetchInterval: 60_000,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [breakMins, setBreakMins] = useState("0");
  const [note, setNote] = useState<null | { type: "activity" | "note"; text: string }>(null);
  const [photo, setPhoto] = useState<null | { file: File; caption: string; child: string }>(null);

  const data = query.data;
  if (!data) return null;
  const isNanny = data.access === "nanny";
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["today", slug] }),
      client.invalidateQueries({ queryKey: ["expected-shifts", slug] }),
      client.invalidateQueries({ queryKey: ["timesheets", slug] }),
    ]);

  const run = async (job: () => Promise<unknown>, done: string) => {
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
    run(
      () => careFn({ data: { slug, event: { kind: "meal", detail } } }),
      t("tl.logged", { title }),
    );

  const sharePhoto = async () => {
    if (!photo) return;
    const ok = await run(async () => {
      const base64 = await shrink(photo.file);
      await photoFn({
        data: {
          slug,
          moment: {
            kind: "photo",
            momentDate: data.today,
            caption: photo.caption,
            childId: photo.child || undefined,
            fileName: "photo.jpg",
            contentType: "image/jpeg",
            base64,
          },
        },
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
      () =>
        plannerFn({
          data: {
            slug,
            entryDate: data.today,
            timeLabel: data.now,
            title: note.text.trim(),
            entryType: note.type,
          },
        }),
      note.type === "activity" ? t("tl.activityAdded") : t("tl.noteAdded"),
    );
    if (ok) setNote(null);
  };

  // "Shift 15:00 – 19:30 · started 15:02": the plan, then what has actually happened.
  const status =
    [
      data.scheduled &&
        t("tl.shiftTimes", { start: data.scheduled.start, end: data.scheduled.end }),
      data.shift
        ? data.shift.open
          ? t("tl.startedShort", { time: data.shift.startedAt })
          : t("tl.finishedShort", {
              time: data.shift.endedAt ?? "",
              duration: hm(data.shift.minutes),
            })
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("tl.noShiftToday");
  const timed = data.timeline.filter((i) => i.at);
  const latest = [
    ...timed.filter((i) => i.state === "done").slice(-2),
    ...timed.filter((i) => i.state !== "done").slice(0, 2),
  ];

  return (
    <div className="space-y-5">
      <div className="surface-card rise p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid size-11 flex-none place-items-center rounded-full bg-brand-soft text-[1rem] font-semibold text-brand">
              {(data.nannyName ?? "").charAt(0)}
              {data.shift?.open && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-positive"
                  aria-hidden
                />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[1.0625rem] font-semibold leading-tight text-foreground">
                {data.nannyName}
              </p>
              <p className="num mt-0.5 text-[0.8125rem] text-muted-foreground">{status}</p>
            </div>
          </div>
          {data.shift && !data.shift.open && isNanny && (
            <p className="w-full text-sm text-muted-foreground">{t("tl.sentToYourTimesheetFor")}</p>
          )}
          {isNanny && !data.shift && (
            <Button
              size="lg"
              className="relative"
              disabled={busy}
              onClick={() => void run(() => startFn({ data: { slug } }), t("tl.shiftStarted"))}
            >
              <Play className="h-4 w-4" />
              {t("tl.startShift")}
            </Button>
          )}
          {isNanny && data.shift?.open && !ending && (
            <Button
              size="lg"
              variant="outline"
              className="relative"
              disabled={busy}
              onClick={() => setEnding(true)}
            >
              <Square className="h-4 w-4" />
              {t("tl.endShift")}
            </Button>
          )}
        </div>
        {data.shift?.open && data.scheduled && (
          <ShiftProgress start={data.shift.startedAt} end={data.scheduled.end} now={data.now} />
        )}
        {ending && (
          <form
            className="relative mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () => endFn({ data: { slug, breakMinutes: Number(breakMins) || 0 } }),
                t("tl.shiftFinishedAndSentFor"),
              ).then((ok) => ok && setEnding(false));
            }}
          >
            <label className="block text-sm font-medium text-foreground">
              {t("tl.unpaidBreakMinutes")}
              <Input
                className="mt-1.5 w-32"
                type="number"
                min="0"
                max="720"
                value={breakMins}
                onChange={(e) => setBreakMins(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {t("tl.finishAndSendHours")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEnding(false)}>
              {t("tl.cancel")}
            </Button>
          </form>
        )}
      </div>

      <div className="-mb-2 flex items-center gap-2.5">
        <h2 id="today-title" className="text-[1.0625rem] font-semibold text-foreground">
          {!isNanny && data.nannyName ? t("tl.todayWith", { name: data.nannyName }) : t("tl.today")}
        </h2>
        {data.shift?.open && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-positive">
            <span
              className="size-1.5 rounded-full bg-positive motion-safe:animate-pulse"
              aria-hidden
            />
            {t("tl.live")} · <span className="num">{data.now}</span>
          </span>
        )}
      </div>
      <div className="surface-card p-4" role="group" aria-labelledby="quick-log-title">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2
            id="quick-log-title"
            className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-foreground"
          >
            {t("tl.quickRoutineLog")}
          </h2>
          <span className="text-[0.75rem] text-muted-foreground">{t("tl.oneTapEntry")}</span>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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
          <Chip
            tint="butter"
            icon={StickyNote}
            label={t("tl.note")}
            onClick={() => setNote({ type: "note", text: "" })}
          />
          <ChipLink
            tint="rose"
            icon={Pill}
            label={t("tl.medicine")}
            to="/medication/$slug"
            slug={slug}
          />
          <Chip
            tint="sage"
            icon={Utensils}
            label={t("tl.snack")}
            disabled={busy}
            onClick={() => void log("Snack", t("tl.snack"))}
          />
          <Chip
            tint="sage"
            icon={Utensils}
            label={t("tl.dinner")}
            disabled={busy}
            onClick={() => void log("Dinner", t("tl.dinner"))}
          />
          <Chip
            tint="sky"
            icon={CalendarClock}
            label={t("tl.activity")}
            onClick={() => setNote({ type: "activity", text: "" })}
          />
          <Chip
            tint="lilac"
            icon={Camera}
            label={t("tl.photo")}
            onClick={() => fileRef.current?.click()}
          />
          <ChipLink
            tint="apricot"
            icon={Receipt}
            label={t("tl.expense")}
            to="/handover/$slug"
            slug={slug}
          />
        </div>
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
            placeholder={
              note.type === "activity" ? t("tl.whatAreYouDoingE") : t("tl.aNoteForToday")
            }
            value={note.text}
            onChange={(e) => setNote({ ...note, text: e.target.value })}
          />
          <Button type="submit" disabled={busy || !note.text.trim()}>
            {t("tl.add")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setNote(null)}>
            {t("tl.cancel")}
          </Button>
        </form>
      )}

      {photo && (
        <Card>
          <p className="text-sm font-medium text-foreground">{t("tl.shareThisPhoto")}</p>
          <img
            src={URL.createObjectURL(photo.file)}
            alt="Preview"
            className="mt-3 max-h-56 rounded-xl object-cover"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={t("tl.addACaptionOptional")}
              value={photo.caption}
              onChange={(e) => setPhoto({ ...photo, caption: e.target.value })}
            />
            {data.children.length > 0 && (
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={photo.child}
                onChange={(e) => setPhoto({ ...photo, child: e.target.value })}
              >
                <option value="">{t("tl.allOfTheChildren")}</option>
                {data.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={busy} onClick={() => void sharePhoto()}>
              {t("tl.share")}
            </Button>
            <Button variant="ghost" onClick={() => setPhoto(null)}>
              {t("tl.cancel")}
            </Button>
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

      {home ? (
        <section aria-labelledby="latest-title" className="surface-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="latest-title"
              className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-foreground"
            >
              {t("tl.latest")}
            </h2>
            <Link
              to="/today/$slug"
              params={{ slug }}
              className="-my-2 flex min-h-11 items-center text-[0.8125rem] font-medium text-foreground underline underline-offset-4"
            >
              {t("tl.wholeDay")}
            </Link>
          </div>
          {latest.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("tl.nothingYetTodayStartThe")}</p>
          ) : (
            <ol className="relative ml-3 mt-3 space-y-1 border-l border-border pl-5">
              {latest.map((item) => (
                <TimelineRow key={item.id} item={item} compact />
              ))}
            </ol>
          )}
        </section>
      ) : (
        <section aria-labelledby="today-title" className="pt-1">
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
      )}
    </div>
  );
}

/** Home: the newest photo from today, one tap from all of them. */
export function LatestPhotoCard({ slug }: { slug: string }) {
  const t = useT();
  const todayFn = useServerFn(getTodayFn);
  // Same key as TodayTimeline, so this reads its cached answer instead of asking again.
  const { data } = useQuery({
    queryKey: ["today", slug],
    queryFn: () => todayFn({ data: { slug } }),
    refetchInterval: 60_000,
  });
  const latest = data?.timeline.filter((i) => i.photoUrl).at(-1);
  if (!latest?.photoUrl) return null;
  return (
    <Link
      to="/moments/$slug"
      params={{ slug }}
      className="surface-card flex items-center gap-3 p-3 transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
    >
      <img
        src={latest.photoUrl}
        alt=""
        loading="lazy"
        className="size-16 flex-none rounded-xl object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="num block text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-foreground">
          {t("tl.newPhotoAt", { time: latest.at ?? "" })}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
          {latest.detail ?? latest.title}
        </span>
      </span>
      <ChevronRight className="size-4 flex-none text-muted-foreground" aria-hidden />
    </Link>
  );
}

/** `compact`: a row inside a white card on Home, without its photo. */
function TimelineRow({ item, compact = false }: { item: TimelineItem; compact?: boolean }) {
  const t = useT();
  const Icon = ICONS[item.kind];
  const next = item.state === "next";
  const upcoming = item.state === "upcoming";
  return (
    <li className="relative pb-3">
      <span
        data-tint={item.attention ? "rose" : KIND_TINT[item.kind]}
        className={`absolute -left-[1.95rem] top-0.5 grid h-6 w-6 place-items-center rounded-full ring-4 ${compact ? "ring-card" : "ring-background"} ${
          next
            ? "bg-primary text-primary-foreground"
            : upcoming
              ? "bg-muted text-muted-foreground"
              : "bg-[var(--tint-bg)] text-[var(--tint-fg)]"
        }`}
        aria-hidden
      >
        <Icon className="h-3 w-3" />
      </span>
      <div
        className={`rounded-2xl ${compact ? "px-3 py-1.5" : "p-3"} ${next && !compact ? "bg-card shadow-sm ring-1 ring-primary/30" : ""}`}
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="num text-sm font-semibold text-foreground">{item.at ?? "Today"}</span>
          <span className={`text-sm ${upcoming ? "text-muted-foreground" : "text-foreground"}`}>
            {item.title}
          </span>
          {next && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
              {t("tl.next")}
            </span>
          )}
          {item.attention && (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[0.6875rem] font-medium text-warning">
              {t("tl.check")}
            </span>
          )}
        </div>
        {(item.detail || item.childName) && (
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {[item.childName, item.detail].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.photoUrl && !compact && (
          <img
            src={item.photoUrl}
            alt={item.title}
            loading="lazy"
            className="mt-2 max-h-44 rounded-xl object-cover"
          />
        )}
      </div>
    </li>
  );
}

type Tint = "sage" | "sky" | "lilac" | "butter" | "apricot" | "rose";

const chipClass =
  "flex h-[5.25rem] w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-[var(--tint-bg)] px-1 text-center text-[0.75rem] font-semibold text-[var(--tint-fg)] ring-1 ring-black/[0.04] transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50 motion-reduce:active:scale-100";

function Chip({
  icon: Icon,
  label,
  onClick,
  disabled,
  tint,
}: {
  icon: typeof Clock3;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tint: Tint;
}) {
  return (
    <button
      type="button"
      data-tint={tint}
      className={chipClass}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

function ChipLink({
  icon: Icon,
  label,
  to,
  slug,
  tint,
}: {
  icon: typeof Clock3;
  label: string;
  to: "/medication/$slug" | "/handover/$slug";
  slug: string;
  tint: Tint;
}) {
  return (
    <Link to={to} params={{ slug }} data-tint={tint} className={chipClass}>
      <Icon className="h-5 w-5" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** How far through today's shift we are: from when it actually started to the scheduled finish. */
function ShiftProgress({ start, end, now }: { start: string; end: string; now: string }) {
  const t = useT();
  const total = toMins(end) - toMins(start);
  // shortcut: same-day shifts only; overnight shifts (end before start) skip the bar.
  if (total <= 0) return null;
  const elapsed = Math.max(0, toMins(now) - toMins(start));
  const left = total - elapsed;
  const percent = Math.min(100, Math.round((elapsed / total) * 100));
  return (
    <div className="relative mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
        <span className="text-muted-foreground">
          {t("tl.elapsed")} <span className="num font-semibold text-foreground">{hm(elapsed)}</span>
        </span>
        <span className="num inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 font-semibold text-positive">
          <span className="size-1.5 rounded-full bg-positive" aria-hidden />
          {left >= 0
            ? t("tl.remaining", { time: hm(left) })
            : t("tl.overScheduled", { time: hm(-left) })}
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t("tl.percentDone", { percent })}
      >
        <div
          className="h-full origin-left rounded-full bg-positive transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
      <div className="num mt-2 flex justify-between text-[0.75rem] text-muted-foreground">
        <span>{t("tl.startAt", { time: start })}</span>
        <span className="font-medium text-foreground">{t("tl.percentDone", { percent })}</span>
        <span>{t("tl.finishAt", { time: end })}</span>
      </div>
    </div>
  );
}

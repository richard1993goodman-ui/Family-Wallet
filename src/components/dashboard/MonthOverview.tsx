import { Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Clock3, NotebookPen, StickyNote } from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";

import { getMonth } from "@/lib/family.functions";
import {
  buildMonth,
  shiftMonth,
  shiftRowHours,
  type MonthData,
  type MonthDay,
  type MonthEntry,
  type MonthSchedule,
} from "@/lib/month-overview";
import { cn } from "@/lib/utils";

type Role = "family" | "nanny";

const EMPTY: MonthData = { entries: [], logs: [], shifts: [] };
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** The day track runs 07:00–21:00; a shift becomes a span of it in percent. */
const TRACK_START = 7;
const TRACK_HOURS = 14;
/** A full-height bar in the month grid. */
const BAR_HOURS = 10;

const hrs = (n: number) => String(Math.round(n * 10) / 10);
const hhmm = (time: string) => time.slice(0, 5);
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const dateLabel = (iso: string, options: Intl.DateTimeFormatOptions) =>
  utc(iso).toLocaleDateString("en-GB", { timeZone: "UTC", ...options });

function span(start: string | null | undefined, end: string | null | undefined) {
  const at = (value: string | null | undefined) => {
    const match = value?.match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) + Number(match[2]) / 60 : null;
  };
  const from = at(start);
  const to = at(end);
  if (from === null || to === null || to <= from) return null;
  const clamp = (h: number) =>
    (Math.min(Math.max(h - TRACK_START, 0), TRACK_HOURS) / TRACK_HOURS) * 100;
  return { left: `${clamp(from)}%`, width: `${Math.max(clamp(to) - clamp(from), 3)}%` };
}

/** The home screen's month: hours as a bar in every day, and the chosen day's hours, update and notes. */
export function MonthOverview({
  slug,
  schedules,
  today,
  role,
}: {
  slug: string;
  schedules: MonthSchedule[];
  /** Today in London, "YYYY-MM-DD". */
  today: string;
  role: Role;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const monthFn = useServerFn(getMonth);
  const query = useQuery({
    queryKey: ["month", slug, month],
    queryFn: () => monthFn({ data: { slug, month } }),
    placeholderData: keepPreviousData,
  });
  return (
    <MonthView
      slug={slug}
      schedules={schedules}
      today={today}
      role={role}
      month={month}
      onMonth={setMonth}
      data={query.data ?? EMPTY}
    />
  );
}

export function MonthView({
  slug,
  schedules,
  today,
  role,
  month,
  onMonth,
  data,
}: {
  slug: string;
  schedules: MonthSchedule[];
  today: string;
  role: Role;
  month: string;
  onMonth: (month: string) => void;
  data: MonthData;
}) {
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<View>("month");
  const { days, totals: monthTotals } = useMemo(
    () => buildMonth(month, data, schedules),
    [month, data, schedules],
  );
  const day = days.find((d) => d.iso === selected) ?? days.find((d) => d.inMonth)!;
  const dayIndex = days.indexOf(day);
  const weekDays = days.slice(dayIndex - (dayIndex % 7), dayIndex - (dayIndex % 7) + 7);
  const visible = view === "month" ? days.filter((d) => d.inMonth) : view === "week" ? weekDays : [day];
  const totals =
    view === "month"
      ? monthTotals
      : {
          agreedHours: visible.reduce((t, d) => t + d.agreedHours, 0),
          loggedHours: visible.reduce((t, d) => t + d.loggedHours, 0),
          updates: visible.filter((d) => d.logs.length).length,
          parentNotes: visible.reduce((t, d) => t + d.parentNotes.length, 0),
        };
  const nanny = schedules.length === 1 ? schedules[0]!.nannyName.split(" ")[0]! : null;

  function go(next: string) {
    onMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  function step(by: number) {
    if (view === "month") return go(shiftMonth(month, by));
    const next = addDays(day.iso, by * (view === "week" ? 7 : 1));
    if (next.slice(0, 7) !== month) onMonth(next.slice(0, 7));
    setSelected(next);
  }

  function goToday() {
    onMonth(today.slice(0, 7));
    setSelected(today);
  }

  const onToday =
    view === "month"
      ? month === today.slice(0, 7)
      : view === "week"
        ? weekDays.some((d) => d.iso === today)
        : day.iso === today;
  const title =
    view === "month"
      ? dateLabel(`${month}-01`, { month: "long", year: "numeric" })
      : view === "week"
        ? `${dateLabel(weekDays[0]!.iso, { day: "numeric", month: "short" })} – ${dateLabel(weekDays[6]!.iso, { day: "numeric", month: "short" })}`
        : dateLabel(day.iso, { weekday: "short", day: "numeric", month: "short" });
  const unit = view === "month" ? "month" : view === "week" ? "week" : "day";

  const progress = totals.agreedHours ? Math.min(totals.loggedHours / totals.agreedHours, 1) : 0;

  return (
    <section className="surface-card overflow-hidden" aria-label="This month">
      <div className="px-5 pt-5 md:px-6">
        <div
          role="tablist"
          aria-label="Calendar view"
          className="inline-flex rounded-full bg-muted p-1"
        >
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "h-8 rounded-full px-4 text-sm font-medium capitalize transition-colors duration-150",
                view === v
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 md:px-6">
        <h2 className="heading-display text-[1.375rem] leading-tight tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-1.5">
          {!onToday && (
            <button
              type="button"
              onClick={goToday}
              className={cn(PILL, "px-3.5")}
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={`Previous ${unit}`}
            className={cn(PILL, "w-9")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={`Next ${unit}`}
            className={cn(PILL, "w-9")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-[1.5fr_1fr_1fr] gap-4 px-5 md:px-6">
        <Stat label="Hours logged" value={hrs(totals.loggedHours)}>
          <span
            className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${hrs(totals.loggedHours)} of ${hrs(totals.agreedHours)} agreed hours`}
          >
            <span
              className="block h-full origin-left rounded-full bg-brand transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${progress})` }}
            />
          </span>
          <span className="num mt-1.5 block text-xs text-muted-foreground">
            of {hrs(totals.agreedHours)} agreed
          </span>
        </Stat>
        <Stat label="Updates" value={String(totals.updates)} dot="bg-tint-sky-ink" />
        <Stat label="Notes" value={String(totals.parentNotes)} dot="bg-tint-apricot-ink" />
      </dl>

      <div
        className={cn("mt-5 grid border-t border-rule", view !== "day" && "lg:grid-cols-2")}
      >
        {view !== "day" && (
        <div className="p-3 sm:p-5 md:px-6">
          <div className="grid grid-cols-7" aria-hidden="true">
            {WEEKDAYS.map((letter, i) => (
              <span
                key={i}
                className="pb-1.5 text-center text-[11px] font-medium text-muted-foreground"
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {(view === "week" ? weekDays : days).map((d) => (
              <DayCell
                key={d.iso}
                day={d}
                today={d.iso === today}
                selected={d.iso === day.iso}
                onSelect={() => setSelected(d.iso)}
              />
            ))}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
            <Key swatch="h-2.5 w-1.5 bg-brand">Hours logged</Key>
            <Key swatch="h-2.5 w-1.5 bg-brand/25">Agreed hours</Key>
            <Key swatch="h-1.5 w-1.5 bg-tint-sky-ink">Update</Key>
            <Key swatch="h-1.5 w-1.5 bg-tint-apricot-ink">Parent note</Key>
          </p>
        </div>
        )}

        <DayView
          key={day.iso}
          slug={slug}
          day={day}
          today={day.iso === today}
          role={role}
          nanny={nanny}
        />
      </div>
    </section>
  );
}

type View = "day" | "week" | "month";

function addDays(isoDate: string, by: number) {
  const d = utc(isoDate);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

const PILL =
  "inline-flex h-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground transition-[transform,background-color] duration-100 ease-out hover:bg-accent active:scale-[0.94]";

function Stat({
  label,
  value,
  dot,
  children,
}: {
  label: string;
  value: string;
  dot?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dot && (
          <span className={cn("h-1.5 w-1.5 flex-none rounded-full", dot)} aria-hidden="true" />
        )}
        <span className="truncate">{label}</span>
      </dt>
      <dd>
        <span className="num heading-display block text-[1.75rem] leading-[1.15] tracking-[-0.02em] text-foreground">
          {value}
        </span>
        {children}
      </dd>
    </div>
  );
}

function Key({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("rounded-full", swatch)} aria-hidden="true" />
      {children}
    </span>
  );
}

function DayCell({
  day,
  today,
  selected,
  onSelect,
}: {
  day: MonthDay;
  today: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const hours = day.loggedHours || day.agreedHours;
  const summary = [
    day.loggedHours
      ? `${hrs(day.loggedHours)} hours logged`
      : hours
        ? `${hrs(hours)} hours agreed`
        : "",
    day.logs.length ? "daily update" : "",
    day.parentNotes.length
      ? `${day.parentNotes.length} parent note${day.parentNotes.length === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${dateLabel(day.iso, { weekday: "long", day: "numeric", month: "long" })}${today ? ", today" : ""}${summary.length ? `: ${summary.join(", ")}` : ""}`}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col items-center rounded-xl pb-1.5 pt-1 transition-[transform,background-color] duration-100 ease-out active:scale-[0.94]",
        selected ? "bg-accent" : "hover:bg-raised",
        !day.inMonth && "opacity-35",
      )}
    >
      <span
        className={cn(
          "num flex h-7 w-7 items-center justify-center rounded-full text-sm",
          today ? "bg-brand font-semibold text-brand-foreground" : "text-foreground",
        )}
      >
        {utc(day.iso).getUTCDate()}
      </span>
      <span className="mt-0.5 flex h-6 items-end" aria-hidden="true">
        <span
          className={cn("w-1.5 rounded-full", day.loggedHours ? "bg-brand" : "bg-brand/25")}
          style={{ height: hours ? `${Math.max(Math.min(hours / BAR_HOURS, 1) * 100, 15)}%` : 0 }}
        />
      </span>
      <span className="mt-1 flex h-1.5 gap-0.5" aria-hidden="true">
        {day.logs.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-tint-sky-ink" />}
        {day.parentNotes.length > 0 && (
          <span className="h-1.5 w-1.5 rounded-full bg-tint-apricot-ink" />
        )}
      </span>
    </button>
  );
}

function DayView({
  slug,
  day,
  today,
  role,
  nanny,
}: {
  slug: string;
  day: MonthDay;
  today: boolean;
  role: Role;
  nanny: string | null;
}) {
  const pending = day.shifts.some((s) => s.status === "pending");
  return (
    <div className="animate-in fade-in border-t border-rule p-5 duration-200 first:border-t-0 md:px-6 lg:border-l lg:border-t-0 lg:first:border-l-0">
      <p className="text-[0.8125rem] font-medium text-brand">
        {today ? "Today" : dateLabel(day.iso, { weekday: "long" })}
      </p>
      <h3 className="heading-display text-xl leading-tight tracking-[-0.015em] text-foreground">
        {dateLabel(
          day.iso,
          today
            ? { weekday: "long", day: "numeric", month: "long" }
            : { day: "numeric", month: "long" },
        )}
      </h3>

      <Block
        icon={Clock3}
        tint="sage"
        title="Hours"
        aside={
          day.loggedHours
            ? `${hrs(day.loggedHours)}h logged`
            : day.agreedHours
              ? `${hrs(day.agreedHours)}h agreed`
              : undefined
        }
      >
        {day.agreedHours > 0 || day.shifts.length > 0 ? (
          <>
            <div
              className="relative h-2.5 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              {day.agreed.flatMap(({ shift }, i) =>
                [span(shift.startTime, shift.endTime), span(shift.startTime2, shift.endTime2)].map(
                  (s, j) =>
                    s && (
                      <span
                        key={`a${i}${j}`}
                        className="absolute inset-y-0 rounded-full bg-brand/25"
                        style={s}
                      />
                    ),
                ),
              )}
              {day.shifts.map((shift) => {
                const s = span(shift.start_time, shift.is_overnight ? "23:59" : shift.end_time);
                return (
                  s && (
                    <span
                      key={shift.id}
                      className="absolute inset-y-0 rounded-full bg-brand"
                      style={s}
                    />
                  )
                );
              })}
            </div>
            <div
              className="num mt-1 flex justify-between text-[11px] text-muted-foreground"
              aria-hidden="true"
            >
              <span>7am</span>
              <span>2pm</span>
              <span>9pm</span>
            </div>
            <ul className="num mt-2 space-y-1 text-sm">
              {day.agreed.map(({ nannyName, shift }) => (
                <li key={nannyName} className="flex justify-between gap-3">
                  <span className="text-foreground">
                    {shift.startTime}–{shift.endTime}
                    {shift.startTime2 && shift.endTime2
                      ? `, ${shift.startTime2}–${shift.endTime2}`
                      : ""}
                  </span>
                  <span className="text-muted-foreground">{nannyName} · agreed</span>
                </li>
              ))}
              {day.shifts.map((shift) => (
                <li key={shift.id} className="flex justify-between gap-3">
                  <span className="font-medium text-foreground">
                    {hhmm(shift.start_time)}–{hhmm(shift.end_time)} · {hrs(shiftRowHours(shift))}h
                  </span>
                  <span className="text-muted-foreground">
                    {shift.shift_type === "babysitting" ? "Babysitting · " : "Logged · "}
                    {shift.status}
                  </span>
                </li>
              ))}
            </ul>
            {pending && role === "family" && (
              <DayLink slug={slug} to="/timesheets/$slug">
                Review hours
              </DayLink>
            )}
          </>
        ) : (
          <Quiet>{day.cancelled ? "The regular shift is cancelled." : "Not a working day."}</Quiet>
        )}
      </Block>

      <Block
        icon={NotebookPen}
        tint="sky"
        title={role === "nanny" ? "Your update" : nanny ? `${nanny}'s update` : "Nanny update"}
        aside={day.logs.find((log) => log.mood)?.mood ?? undefined}
      >
        {day.logs.length > 0 ? (
          <div className="space-y-3">
            {day.logs.map((log) => (
              <dl key={log.id} className="space-y-1.5 text-sm">
                <Field label="Did">{log.activities}</Field>
                <Field label="Ate">{log.food}</Field>
                <Field label="Homework">{log.homework}</Field>
                <Field label="Notes">{log.notes}</Field>
                <Field label="Tomorrow">{log.tomorrow}</Field>
              </dl>
            ))}
          </div>
        ) : (
          <Quiet>No update for this day.</Quiet>
        )}
        {role === "nanny" && today && (
          <DayLink slug={slug} to="/log/$slug">
            {day.logs.length ? "Add to today's log" : "Write today's log"}
          </DayLink>
        )}
      </Block>

      <Block
        icon={StickyNote}
        tint="apricot"
        title={role === "family" ? "Your notes" : "From the parents"}
        aside={day.parentNotes.length ? String(day.parentNotes.length) : undefined}
      >
        {day.parentNotes.length > 0 ? (
          <Entries entries={day.parentNotes} />
        ) : (
          <Quiet>No notes for this day.</Quiet>
        )}
        {day.nannyPlans.length > 0 && (
          <>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {role === "nanny" ? "Added by you" : `Added by ${nanny ?? "your nanny"}`}
            </p>
            <div className="mt-1.5">
              <Entries entries={day.nannyPlans} />
            </div>
          </>
        )}
        <DayLink slug={slug} to="/planner/$slug">
          {role === "family" ? "Add a note" : "Open calendar"}
        </DayLink>
      </Block>
    </div>
  );
}

function Block({
  icon: Icon,
  tint,
  title,
  aside,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  tint: string;
  title: string;
  aside?: string | undefined;
  children: ReactNode;
}) {
  return (
    <section data-tint={tint} className="mt-5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="ios-icon h-7 w-7 rounded-lg">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h4 className="flex-1 text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h4>
        {aside && (
          <span
            className="num inline-block rounded-full px-2.5 py-0.5 text-xs font-medium first-letter:uppercase"
            style={{ backgroundColor: "var(--tint-bg)", color: "var(--tint-fg)" }}
          >
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: string | null }) {
  if (!children) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-[4.5rem] flex-none text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-foreground">{children}</dd>
    </div>
  );
}

function Entries({ entries }: { entries: MonthEntry[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span className="num w-[4.5rem] flex-none text-muted-foreground">
            {entry.time_label ?? "Any time"}
          </span>
          <span className="min-w-0">
            <span className="block text-foreground">
              {entry.title}
              {entry.child_name && (
                <span className="text-muted-foreground"> · {entry.child_name}</span>
              )}
            </span>
            {entry.notes && (
              <span className="mt-0.5 block whitespace-pre-wrap text-[0.8125rem] leading-snug text-muted-foreground">
                {entry.notes}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function DayLink({
  slug,
  to,
  children,
}: {
  slug: string;
  to: "/planner/$slug" | "/log/$slug" | "/timesheets/$slug";
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="mt-2.5 inline-flex items-center gap-0.5 text-sm font-medium text-brand transition-opacity hover:opacity-70 active:opacity-50"
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

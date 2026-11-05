import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { WorkingDay } from "@/lib/agreement.model";

type NannySchedule = { nannyId: string; nannyName: string; workingDays: WorkingDay[] };

function shortTime(value: string) {
  return value.replace(/:00$/, "").replace(/^0/, "");
}

/** The day track runs 07:00–21:00; a shift becomes a span of it in percent. */
const TRACK_START = 7;
const TRACK_HOURS = 14;

function hours(value: string | null | undefined) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) + Number(match[2]) / 60 : null;
}

function shiftSpan(start: string | null | undefined, end: string | null | undefined) {
  const from = hours(start);
  const to = hours(end);
  if (from === null || to === null || to <= from) return null;
  const clamp = (h: number) => Math.min(Math.max(h - TRACK_START, 0), TRACK_HOURS);
  const top = (clamp(from) / TRACK_HOURS) * 100;
  return { top, height: Math.max((clamp(to) / TRACK_HOURS) * 100 - top, 4) };
}

export function WeekCalendar({
  slug,
  entries,
  schedules,
}: {
  slug: string;
  entries: Array<{
    id: string;
    entry_date: string;
    time_label: string | null;
    end_time_label: string | null;
    title: string;
    entry_type: string;
    status: string;
  }>;
  schedules: NannySchedule[];
}) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const weekStart = new Date(`${todayIso}T00:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const onDay = (iso: string) => {
    const dayName = new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "long",
      timeZone: "UTC",
    });
    return schedules
      .map((schedule) => ({
        nannyName: schedule.nannyName,
        shift: schedule.workingDays.find((day) => day.day === dayName && day.enabled),
      }))
      .filter((row): row is { nannyName: string; shift: WorkingDay } => Boolean(row.shift));
  };
  const selected = new Date(`${selectedDate}T00:00:00Z`);
  const selectedWorking = onDay(selectedDate);
  const selectedEntries = entries.filter((entry) => entry.entry_date === selectedDate);
  const cancelled = selectedEntries.some(
    (entry) => entry.entry_type === "shift_change" && entry.status === "cancelled",
  );
  const selectedIsToday = selectedDate === todayIso;
  const anyHours = schedules.some((schedule) => schedule.workingDays.some((day) => day.enabled));

  return (
    <div className="surface-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="heading-display text-xl text-foreground">
            {today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">
            Agreed hours sync from each nanny agreement
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/planner/$slug" params={{ slug }}>
            Open calendar
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="This week">
        {weekDays.map((iso) => {
          const date = new Date(`${iso}T00:00:00Z`);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          const hasEntries = entries.some((entry) => entry.entry_date === iso);
          const working = onDay(iso);
          const dayCancelled = entries.some(
            (entry) =>
              entry.entry_date === iso &&
              entry.entry_type === "shift_change" &&
              entry.status === "cancelled",
          );
          const label: [string, string?] =
            working.length === 0 || dayCancelled
              ? ["Off"]
              : working.length === 1
                ? [shortTime(working[0]!.shift.startTime), shortTime(working[0]!.shift.endTime)]
                : [`${working.length} on`];
          const spans = dayCancelled
            ? []
            : working.flatMap(({ shift }) => [
                shiftSpan(shift.startTime, shift.endTime),
                shiftSpan(shift.startTime2, shift.endTime2),
              ]);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}${isToday ? ", today" : ""}`}
              className={`group flex min-w-0 cursor-pointer flex-col items-center rounded-md px-1 pb-2 pt-2.5 transition-colors ${
                isSelected ? "bg-accent" : "hover:bg-raised"
              }`}
            >
              <span className="text-xs text-muted-foreground">
                {date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
              </span>
              <span
                className={`num mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[0.9375rem] ${
                  isToday ? "bg-brand font-medium text-brand-foreground" : "text-foreground"
                }`}
              >
                {date.getUTCDate()}
              </span>
              <span
                className="relative mt-2 h-14 w-2 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                {spans.map(
                  (span, i) =>
                    span && (
                      <span
                        key={i}
                        className="absolute inset-x-0 rounded-full bg-brand"
                        style={{ top: `${span.top}%`, height: `${span.height}%` }}
                      />
                    ),
                )}
              </span>
              <span
                className={`num mt-2 flex w-full flex-col items-center text-[11px] leading-[1.3] sm:flex-row sm:justify-center ${
                  label[0] === "Off" ? "text-muted-foreground/85" : "text-foreground"
                }`}
              >
                <span>{label[0]}</span>
                {label[1] && (
                  <>
                    <span className="hidden sm:inline">–</span>
                    <span className="text-muted-foreground sm:text-foreground">{label[1]}</span>
                  </>
                )}
              </span>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${hasEntries ? "bg-foreground" : "bg-transparent"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 border-t border-rule pt-5 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {selectedIsToday
              ? "Today"
              : selected.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                })}
          </p>
          {!cancelled &&
            selectedWorking.map((row) => (
              <p
                key={row.nannyName}
                className="num mt-2 flex items-center gap-2 text-sm text-foreground"
              >
                <span className="h-2 w-2 flex-none rounded-full bg-brand" aria-hidden="true" />
                {row.nannyName} · {row.shift.startTime}–{row.shift.endTime}
                {row.shift.startTime2 && row.shift.endTime2
                  ? ` and ${row.shift.startTime2}–${row.shift.endTime2}`
                  : ""}
              </p>
            ))}
          {cancelled && (
            <p className="mt-2 text-sm text-muted-foreground">
              The regular nanny shift is cancelled on this day.
            </p>
          )}
          <div className="mt-2 space-y-1.5">
            {selectedEntries.length === 0 && selectedWorking.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing planned for this day yet.</p>
            )}
            {selectedEntries.map((entry) => (
              <div key={entry.id} className="flex gap-3 text-sm">
                <span className="num w-24 flex-shrink-0 text-muted-foreground">
                  {entry.time_label ?? "Any time"}
                  {entry.end_time_label ? `–${entry.end_time_label}` : ""}
                </span>
                <span className="text-foreground">{entry.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Agreed nanny hours</p>
          {anyHours ? (
            <div className="mt-2 space-y-3">
              {schedules
                .filter((schedule) => schedule.workingDays.some((day) => day.enabled))
                .map((schedule) => (
                  <div key={schedule.nannyId}>
                    <p className="text-sm text-muted-foreground">{schedule.nannyName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {schedule.workingDays
                        .filter((day) => day.enabled)
                        .map((day) => (
                          <span
                            key={day.day}
                            className="num rounded-sm bg-accent px-2 py-0.5 text-xs text-foreground"
                          >
                            {day.day.slice(0, 3)} {day.startTime}–{day.endTime}
                            {day.startTime2 && day.endTime2
                              ? ` · ${day.startTime2}–${day.endTime2}`
                              : ""}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No days set yet. Add them in each nanny agreement and they appear here.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/planner/$slug" params={{ slug }}>
            Add to calendar
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/log/$slug" params={{ slug }}>
            Add daily notes
          </Link>
        </Button>
      </div>
    </div>
  );
}

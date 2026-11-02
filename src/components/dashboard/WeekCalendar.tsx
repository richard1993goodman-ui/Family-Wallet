import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { WorkingDay } from "@/lib/agreement.model";

type NannySchedule = { nannyId: string; nannyName: string; workingDays: WorkingDay[] };

function shortTime(value: string) {
  return value.replace(/:00$/, "").replace(/^0/, "");
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
    <div className="surface-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Family calendar
          </p>
          <p className="heading-display mt-1 text-2xl text-foreground">
            {today.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Link
          to="/planner/$slug"
          params={{ slug }}
          className="text-sm font-medium text-primary hover:underline"
        >
          Open calendar
        </Link>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Each nanny’s agreed days and hours sync from their nanny agreement. Add activities, school
        dates, notes and one-off shift changes manually.
      </p>

      <div className="mt-5 grid grid-cols-7 gap-1" aria-label="This week">
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
          const label =
            working.length === 0 || dayCancelled
              ? "\u00A0"
              : working.length === 1
                ? `${shortTime(working[0]!.shift.startTime)}-${shortTime(working[0]!.shift.endTime)}`
                : `${working.length} on`;
          return (
            <Button
              key={iso}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              onClick={() => setSelectedDate(iso)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}${isToday ? ", today" : ""}`}
              className={`relative h-auto min-w-0 flex-col gap-1 px-1 py-2 ${isToday && !isSelected ? "ring-1 ring-primary" : ""}`}
            >
              <span className="text-[10px] font-semibold uppercase">
                {date
                  .toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })
                  .slice(0, 2)}
              </span>
              <span className="text-base">{date.getUTCDate()}</span>
              <span className="text-[9px] leading-tight opacity-80">{label}</span>
              <span
                className={`h-1 w-1 rounded-full ${hasEntries ? "bg-current" : "bg-transparent"}`}
              />
              {isToday && (
                <span className="absolute -bottom-5 text-[10px] font-semibold text-primary">
                  Today
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Agreed nanny hours
        </p>
        {anyHours ? (
          <div className="mt-3 space-y-3">
            {schedules
              .filter((schedule) => schedule.workingDays.some((day) => day.enabled))
              .map((schedule) => (
                <div key={schedule.nannyId}>
                  <p className="text-sm font-medium text-foreground">{schedule.nannyName}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {schedule.workingDays
                      .filter((day) => day.enabled)
                      .map((day) => (
                        <span
                          key={day.day}
                          className="rounded-full bg-accent px-2.5 py-1 text-xs text-foreground"
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
            No days set yet — add them in each nanny agreement and they'll appear here.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="font-medium text-foreground">
          {selectedIsToday
            ? "Today"
            : selected.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              })}
        </p>
      </div>
      {!cancelled &&
        selectedWorking.map((row) => (
          <p
            key={row.nannyName}
            className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
          >
            {row.nannyName} working · {row.shift.startTime}–{row.shift.endTime}
            {row.shift.startTime2 && row.shift.endTime2
              ? ` and ${row.shift.startTime2}–${row.shift.endTime2}`
              : ""}{" "}
            · synced from agreement
          </p>
        ))}
      {cancelled && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          A regular nanny shift has been cancelled on this day.
        </p>
      )}
      <div className="mt-4 space-y-2">
        {selectedEntries.length === 0 && selectedWorking.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing planned for this day yet.</p>
        )}
        {selectedEntries.map((entry) => (
          <div key={entry.id} className="flex gap-3 text-sm">
            <span className="w-24 flex-shrink-0 font-medium text-primary">
              {entry.time_label ?? "Any time"}
              {entry.end_time_label ? `–${entry.end_time_label}` : ""}
            </span>
            <span className="text-foreground">{entry.title}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/planner/$slug" params={{ slug }}>
            Add to calendar
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/log/$slug" params={{ slug }}>
            Add daily notes
          </Link>
        </Button>
      </div>
    </div>
  );
}

import { formatDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import {
  addPlannerEntryFn,
  copyPreviousWeekFn,
  deletePlannerEntryFn,
  getPlanner,
  reviewShiftChangeFn,
} from "@/lib/family.functions";
import { CalendarOverview } from "@/components/CalendarOverview";
import { HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { offPeriodOn, regularHoursApply } from "@/lib/work-hours";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/planner/$slug")({
  head: () => ({
    meta: [
      { title: "Weekly Planner — Family Wallet" },
      {
        name: "description",
        content:
          "Your shared week with your nanny: pickups, clubs, homework and activities, day by day.",
      },
      { property: "og:title", content: "Weekly Planner — Family Wallet" },
      {
        property: "og:description",
        content: "Plan the week together with your nanny, from any phone.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlannerPage,
});

function mondayOf(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDay(iso: string) {
  return formatDate(`${iso}T00:00:00Z`, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function PlannerPage() {
  const t = useT();
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getPlanner);
  const addFn = useServerFn(addPlannerEntryFn);
  const removeFn = useServerFn(deletePlannerEntryFn);
  const reviewFn = useServerFn(reviewShiftChangeFn);
  const copyFn = useServerFn(copyPreviousWeekFn);

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [draft, setDraft] = useState<{
    date: string;
    time: string;
    endTime: string;
    title: string;
    child: string;
    entryType: string;
    status: string;
    notes: string;
    friend?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
  } | null>(null);

  const query = useQuery({
    queryKey: ["planner", slug, weekStart],
    queryFn: () => loadFn({ data: { slug, weekStart } }),
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  if (query.isLoading) {
    return <PageLoading />;
  }
  if (!query.data) return <LockedNotice slug={slug} />;

  const entries = query.data.entries;
  const isParent = query.data.access === "family";
  const workingDays = query.data.workingDays;
  const schedule = query.data.schedule;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["planner", slug] });
  }

  async function onAdd() {
    if (!draft) return;
    try {
      await addFn({
        data: {
          slug,
          entryDate: draft.date,
          timeLabel: draft.time,
          endTimeLabel: draft.endTime,
          title:
            draft.entryType === "playdate" && !draft.title.trim() && draft.friend
              ? `Playdate with ${draft.friend}`
              : draft.title,
          childName: draft.child,
          entryType: draft.entryType,
          status: draft.status,
          notes:
            draft.entryType === "playdate"
              ? [
                  draft.friend && `Friend: ${draft.friend}`,
                  draft.address && `Address: ${draft.address}`,
                  (draft.contactName || draft.contactPhone) &&
                    `Emergency contact: ${[draft.contactName, draft.contactPhone].filter(Boolean).join(" — ")}`,
                  draft.notes,
                ]
                  .filter(Boolean)
                  .join("\n")
              : draft.notes,
        },
      });
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("cal.couldnTAddThat"));
    }
  }

  return (
    <HubPage
      slug={slug}
      title={t("cal.familyCalendar")}
      intro="Your agreement sets normal working hours. Add school dates, plans or one-off shift changes here."
    >
      <CalendarOverview slug={slug} />
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
          {t("cal.previous")}
        </Button>
        <span className="text-sm font-medium text-foreground">
          Week of{" "}
          {formatDate(`${weekStart}T00:00:00Z`, {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          {t("tl.next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">
          {t("cal.agreedNannyHours")}
        </p>
        {workingDays.some((day) => day.enabled) ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {workingDays
              .filter((day) => day.enabled)
              .map((day) => (
                <span
                  key={day.day}
                  className="rounded-full bg-accent px-2.5 py-1 text-xs text-foreground"
                >
                  {day.day.slice(0, 3)} {day.startTime}–{day.endTime}
                  {day.startTime2 && day.endTime2 ? ` · ${day.startTime2}–${day.endTime2}` : ""}
                </span>
              ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("cal.noDaysSetYetAdd")}</p>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {days.map((day) => {
          const dayEntries = entries.filter((e) => e.entry_date === day);
          const weekday = formatDate(`${day}T00:00:00Z`, { weekday: "long", timeZone: "UTC" });
          const off = offPeriodOn(schedule, day);
          const regular =
            off || !regularHoursApply(schedule, day)
              ? undefined
              : workingDays.find((workingDay) => workingDay.day === weekday && workingDay.enabled);
          return (
            <div
              key={day}
              className={`rounded-xl border bg-card p-5 ${
                day === todayIso ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">
                  {formatDay(day)}
                  {day === todayIso && (
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs">
                      {t("today.today")}
                    </span>
                  )}
                </p>
                <button
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() =>
                    setDraft({
                      date: day,
                      time: "",
                      endTime: "",
                      title: "",
                      child: "",
                      entryType: "note",
                      status: "active",
                      notes: "",
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("tl.add")}
                </button>
              </div>

              {regular &&
                !dayEntries.some(
                  (entry) =>
                    entry.entry_type === "shift_change" &&
                    entry.status === "cancelled" &&
                    (entry.approval ?? "approved") === "approved",
                ) && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" /> Regular nanny day ·{" "}
                    {regular.startTime}–{regular.endTime}
                    {regular.startTime2 && regular.endTime2
                      ? ` and ${regular.startTime2}–${regular.endTime2}`
                      : ""}
                  </div>
                )}
              {off && workingDays.some((w) => w.day === weekday && w.enabled) && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Not working · {off.label}
                </div>
              )}
              {dayEntries.length === 0 &&
                !regular &&
                !(off && workingDays.some((w) => w.day === weekday && w.enabled)) && (
                  <p className="mt-2 text-sm text-muted-foreground">{t("cal.nothingPlannedYet")}</p>
                )}
              <ul className="mt-2 space-y-2">
                {dayEntries.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                    <span>
                      {entry.time_label && (
                        <span className="font-medium text-foreground">
                          {entry.time_label}
                          {entry.end_time_label ? `–${entry.end_time_label}` : ""}{" "}
                        </span>
                      )}
                      <span className="text-foreground">{entry.title}</span>
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {entry.entry_type.replace("_", " ")}
                      </span>
                      {entry.child_name && (
                        <span className="text-muted-foreground"> · {entry.child_name}</span>
                      )}
                      {entry.entry_type === "shift_change" &&
                        (entry.approval ?? "approved") === "pending" && (
                          <span className="mt-1 block">
                            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                              {t("cal.awaitingApprovalRegularHoursStand")}
                            </span>
                            {entry.added_by !== (isParent ? "family" : "nanny") && (
                              <span className="ml-2 inline-flex gap-1.5">
                                {(["approved", "declined"] as const).map((decision) => (
                                  <button
                                    key={decision}
                                    type="button"
                                    className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-accent"
                                    onClick={async () => {
                                      try {
                                        await reviewFn({ data: { slug, id: entry.id, decision } });
                                        await refresh();
                                        toast.success(
                                          decision === "approved"
                                            ? t("cal.changeApproved")
                                            : t("cal.changeDeclined"),
                                        );
                                      } catch (e) {
                                        toast.error(
                                          e instanceof Error ? e.message : t("cal.couldnTSaveThat"),
                                        );
                                      }
                                    }}
                                  >
                                    {decision === "approved" ? t("cal.approve") : t("ts.decline")}
                                  </button>
                                ))}
                              </span>
                            )}
                          </span>
                        )}
                      {entry.entry_type === "shift_change" && entry.approval === "declined" && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {t("cal.declined")}
                        </span>
                      )}
                      {entry.entry_type === "playdate" && entry.notes && (
                        <span className="mt-1 block whitespace-pre-wrap text-xs text-muted-foreground">
                          {entry.notes}
                        </span>
                      )}
                    </span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await removeFn({ data: { slug, id: entry.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              {draft?.date === day && (
                <div className="mt-3 space-y-2 rounded-lg bg-accent/40 p-3">
                  <div className="flex gap-2">
                    <Input
                      className="w-24"
                      placeholder="15:45"
                      value={draft.time}
                      onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                    />
                    <Input
                      className="w-24"
                      type="time"
                      value={draft.endTime}
                      onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                    />
                    <Input
                      placeholder={t("cal.schoolPickup")}
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder={t("cal.whichChildOptional")}
                    value={draft.child}
                    onChange={(e) => setDraft({ ...draft, child: e.target.value })}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={draft.entryType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          entryType: e.target.value,
                          title:
                            e.target.value === "school_holiday"
                              ? "School holiday"
                              : e.target.value === "inset_day"
                                ? "Inset day"
                                : draft.title,
                        })
                      }
                    >
                      <option value="note">{t("tl.note")}</option>
                      <option value="activity">{t("tl.activity")}</option>
                      <option value="meal">{t("today.meal")}</option>
                      <option value="school_holiday">{t("cal.schoolHoliday")}</option>
                      <option value="inset_day">{t("cal.insetDay")}</option>
                      <option value="shift_change">{t("cal.shiftChange")}</option>
                      {isParent && <option value="playdate">{t("cal.playdate")}</option>}
                    </select>
                    {draft.entryType === "playdate" && (
                      <p className="self-center text-xs text-muted-foreground">
                        {t("cal.addTheFriendWhereIt")}
                      </p>
                    )}
                    {draft.entryType === "shift_change" && (
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            status: e.target.value,
                            title:
                              e.target.value === "cancelled"
                                ? t("cal.nannyShiftCancelled")
                                : t("cal.changedNannyShift"),
                          })
                        }
                      >
                        <option value="active">{t("cal.changedShift")}</option>
                        <option value="cancelled">{t("cal.cancelRegularShift")}</option>
                      </select>
                    )}
                  </div>
                  {draft.entryType === "playdate" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder={t("cal.friendSName")}
                        value={draft.friend ?? ""}
                        onChange={(e) => setDraft({ ...draft, friend: e.target.value })}
                      />
                      <Input
                        placeholder={t("cal.address")}
                        value={draft.address ?? ""}
                        onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                      />
                      <Input
                        placeholder={t("cal.emergencyContactEGSarah")}
                        value={draft.contactName ?? ""}
                        onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                      />
                      <Input
                        type="tel"
                        placeholder={t("cal.emergencyPhone")}
                        value={draft.contactPhone ?? ""}
                        onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
                      />
                    </div>
                  )}
                  <Input
                    placeholder={t("cal.extraNotesOptional")}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={onAdd}>
                      Add to {formatDay(day).split(" ")[0]}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
                      {t("tl.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="mt-5"
        onClick={async () => {
          const result = await copyFn({ data: { slug, weekStart } });
          toast.success(
            result.copied ? t("cal.copiedItems", { count: result.copied }) : t("cal.lastWeekEmpty"),
          );
          await refresh();
        }}
      >
        {t("cal.copyLastWeekIntoThis")}
      </Button>
    </HubPage>
  );
}

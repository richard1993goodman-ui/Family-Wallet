import { formatMoney } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, HubPage, LockedNotice, PageLoading } from "@/components/hub-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { WorkingDay } from "@/lib/agreement.model";
import { getWorkHours, saveWorkHoursFn } from "@/lib/work-hours.functions";
import { keyDatePresets, termPresets, weeklyHours, type OffPeriod, type WorkSchedule } from "@/lib/work-hours";

export const Route = createFileRoute("/hours/$slug")({
  head: () => ({
    meta: [
      { title: "Working hours — Family Wallet" },
      {
        name: "description",
        content: "Set the days and hours each nanny works so the weekly schedule fits your family.",
      },
      { property: "og:title", content: "Working hours — Family Wallet" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { edit?: string | undefined } => ({
    edit: typeof search["edit"] === "string" ? search["edit"] : undefined,
  }),
  component: HoursPage,
});

// Estimate only: nothing is saved, and the multiplier is whatever the agreement says.
function OvertimeCalculator() {
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [multiplier, setMultiplier] = useState(1.5);
  const total = Math.max(0, Number(hours) || 0) * Math.max(0, Number(rate) || 0) * multiplier;
  return (
    <div className="mt-6">
      <Card>
        <h2 className="heading-display text-lg text-foreground">Overtime calculator</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-foreground">
            Extra hours
            <Input className="mt-1.5" type="number" min="0" step="0.25" value={hours} placeholder="2.5" onChange={(e) => setHours(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Hourly rate (£)
            <Input className="mt-1.5" type="number" min="0" step="0.01" value={rate} placeholder="15.00" onChange={(e) => setRate(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          {[1, 1.25, 1.5, 2].map((m) => (
            <Button key={m} size="sm" variant={multiplier === m ? "default" : "outline"} onClick={() => setMultiplier(m)}>
              {m}×
            </Button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Overtime due</p>
        <p className="heading-display text-3xl text-primary">{formatMoney(total)}</p>
      </Card>
    </div>
  );
}

function HoursPage() {
  const { slug } = Route.useParams();
  const { edit } = Route.useSearch();
  const loadFn = useServerFn(getWorkHours);
  const query = useQuery({
    queryKey: ["work-hours", slug],
    queryFn: () => loadFn({ data: { slug } }),
  });

  if (query.isLoading) return <PageLoading />;
  const data = query.data;
  if (!data) return <LockedNotice slug={slug} />;

  return (
    <HubPage
      slug={slug}
      title="Working hours"
      intro="The days and hours each person works. They fill in the weekly schedule and count leave days. For a one-off change to a single week, add it to the week plan instead."
    >
      {data.nannies.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Add your nanny first, then set their hours here.
          </p>
          {data.access === "family" && (
            <Button className="mt-4" asChild>
              <Link to="/nannies/$slug" params={{ slug }}>
                Add your nanny
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {data.nannies.map((nanny, index) => (
            <NannyHours
              key={`${nanny.nannyId}-${JSON.stringify([nanny.days, nanny.schedule])}`}
              slug={slug}
              nannyId={nanny.nannyId}
              name={nanny.nannyName}
              days={nanny.days}
              schedule={nanny.schedule}
              startOpen={edit === nanny.nannyId || (edit === "first" && index === 0)}
              fromAgreement={nanny.source === "agreement"}
              agreementHasHours={nanny.agreementHasHours}
              canEdit={data.access === "family"}
            />
          ))}
        </div>
      )}
      <OvertimeCalculator />
      <p className="mt-6 text-sm text-muted-foreground">
        Need a one-off change?{" "}
        <Link to="/planner/$slug" params={{ slug }} className="underline underline-offset-4">
          Add it to the week plan
        </Link>
        .
      </p>
    </HubPage>
  );
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const fmtRange = (p: OffPeriod) =>
  p.start === p.end ? fmtDate(p.start) : `${fmtDate(p.start)} to ${fmtDate(p.end)}`;
const fmtHours = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function NannyHours({
  slug,
  nannyId,
  name,
  days: initial,
  schedule: initialSchedule,
  startOpen,
  fromAgreement,
  agreementHasHours,
  canEdit,
}: {
  slug: string;
  nannyId: string;
  name: string;
  days: WorkingDay[];
  schedule: WorkSchedule;
  startOpen: boolean;
  fromAgreement: boolean;
  /** The nanny also has an agreement with hours, so the parent can choose between the two. */
  agreementHasHours: boolean;
  canEdit: boolean;
}) {
  const client = useQueryClient();
  const saveFn = useServerFn(saveWorkHoursFn);
  const [open, setOpen] = useState(startOpen && canEdit);
  const [days, setDays] = useState(initial);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [saving, setSaving] = useState(false);
  // With an agreement, its hours stay in charge until the parent chooses their own shift pattern.
  const agreementLocked = agreementHasHours && schedule.hoursSource !== "manual";
  const editable = canEdit;
  const total = weeklyHours(initial);
  const shown = initial.filter((d) => d.enabled);

  const change = (index: number, patch: Partial<WorkingDay>) =>
    setDays((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const patchSchedule = (patch: Partial<WorkSchedule>) => setSchedule((s) => ({ ...s, ...patch }));
  const addBlank = (label: string) =>
    setSchedule((s) => ({ ...s, offPeriods: [...s.offPeriods, { label, start: "", end: "" }] }));
  const addPeriods = (periods: OffPeriod[]) =>
    setSchedule((s) => {
      const have = new Set(s.offPeriods.map((p) => `${p.label}|${p.start}|${p.end}`));
      return {
        ...s,
        offPeriods: [
          ...s.offPeriods,
          ...periods.filter((p) => !have.has(`${p.label}|${p.start}|${p.end}`)),
        ],
      };
    });
  const changePeriod = (index: number, patch: Partial<OffPeriod>) =>
    setSchedule((s) => ({
      ...s,
      offPeriods: s.offPeriods.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { slug, nannyId, days, schedule } });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["work-hours", slug] }),
        client.invalidateQueries({ queryKey: ["hub-summary", slug] }),
        client.invalidateQueries({ queryKey: ["planner", slug] }),
      ]);
      setOpen(false);
      toast.success("Working hours saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save those hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total > 0 ? `${fmtHours(total)} hours a week` : "No hours set yet"}
            {total > 0 &&
              ` · ${initialSchedule.arrangement === "term_time" ? "Term time only" : "Full time"}`}
            {total > 0 && !initialSchedule.repeat && " · One week only"}
          </p>
        </div>
        {editable && (
          <Button
            size="sm"
            variant={total > 0 ? "outline" : "default"}
            onClick={() => setOpen(true)}
          >
            {agreementLocked ? "Holidays & key dates" : total > 0 ? "Edit hours" : "Add hours"}
          </Button>
        )}
      </div>
      {fromAgreement && (
        <p className="mt-2 text-sm text-muted-foreground">
          These come from your nanny agreement. To use a different shift pattern, choose Holidays &amp; key dates, then use your own.
        </p>
      )}
      {shown.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {shown.map((d) => (
            <li key={d.day} className="flex justify-between gap-3 py-2 text-sm">
              <span className="font-medium text-foreground">{d.day}</span>
              <span className="num text-muted-foreground">
                {d.startTime}–{d.endTime}
                {d.startTime2 && d.endTime2 ? ` and ${d.startTime2}–${d.endTime2}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {initialSchedule.offPeriods.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Not working</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {initialSchedule.offPeriods.map((p) => (
              <li key={`${p.label}-${p.start}`} className="flex justify-between gap-3">
                <span className="text-foreground">{p.label}</span>
                <span className="text-muted-foreground">{fmtRange(p)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!canEdit && !fromAgreement && (
        <p className="mt-3 text-sm text-muted-foreground">
          Ask the family if these need to change.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90svh] flex-col gap-0 p-0 sm:max-w-xl">
          <DialogHeader className="px-6 pb-3 pt-6 text-left">
            <DialogTitle>{name}'s working hours</DialogTitle>
            <DialogDescription>
              {total > 0
                ? `${fmtHours(weeklyHours(days))} hours a week`
                : "Pick the days and times they work."}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 pb-4">
            {agreementHasHours && (
              <fieldset>
                <legend className="text-sm font-medium text-foreground">Which hours should the calendar use?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["agreement", "The agreement's hours", "The days and times in your signed or draft agreement"],
                      ["manual", "My own shift pattern", "Set your own days and split shifts instead"],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                        schedule.hoursSource === value ? "border-foreground bg-card" : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`hours-source-${nannyId}`}
                        className="sr-only"
                        checked={schedule.hoursSource === value}
                        onChange={() => patchSchedule({ hoursSource: value })}
                      />
                      <span className="block font-medium text-foreground">{label}</span>
                      <span className="mt-0.5 block text-muted-foreground">{hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className={cn("divide-y divide-border", agreementLocked && "pointer-events-none opacity-60")} aria-disabled={agreementLocked}>
              {days.map((d, i) => (
                <div key={d.day} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <label className="flex w-32 items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={d.enabled}
                      onChange={(e) => change(i, { enabled: e.target.checked })}
                    />
                    {d.day}
                  </label>
                  {d.enabled ? (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="time"
                        aria-label={`${d.day} start`}
                        className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                        value={d.startTime}
                        onChange={(e) => change(i, { startTime: e.target.value })}
                      />
                      to
                      <input
                        type="time"
                        aria-label={`${d.day} finish`}
                        className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                        value={d.endTime}
                        onChange={(e) => change(i, { endTime: e.target.value })}
                      />
                      {d.startTime2 !== undefined ? (
                        <>
                          <span className="px-1">then</span>
                          <input
                            type="time"
                            aria-label={`${d.day} second shift start`}
                            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                            value={d.startTime2}
                            onChange={(e) => change(i, { startTime2: e.target.value })}
                          />
                          to
                          <input
                            type="time"
                            aria-label={`${d.day} second shift finish`}
                            className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
                            value={d.endTime2 ?? ""}
                            onChange={(e) => change(i, { endTime2: e.target.value })}
                          />
                          <button
                            type="button"
                            className="text-xs underline underline-offset-4"
                            onClick={() =>
                              setDays((current) =>
                                current.map((x, j) => {
                                  if (j !== i) return x;
                                  const { startTime2: _s, endTime2: _e, ...rest } = x;
                                  return rest;
                                }),
                              )
                            }
                          >
                            Remove split
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary underline underline-offset-4"
                          onClick={() =>
                            change(i, {
                              startTime: d.startTime > "09:00" ? "07:00" : d.startTime,
                              endTime: d.endTime > "09:00" ? "09:00" : d.endTime,
                              startTime2: "15:00",
                              endTime2: "19:00",
                            })
                          }
                        >
                          + Add split shift
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not working</span>
                  )}
                </div>
              ))}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-foreground">Arrangement</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["full_time", "Full time", "Works all year, including school holidays"],
                    ["term_time", "Term time only", "Off in school holidays and inset days"],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                      schedule.arrangement === value ? "border-foreground bg-card" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`arrangement-${nannyId}`}
                      className="sr-only"
                      checked={schedule.arrangement === value}
                      onChange={() => {
                        patchSchedule({ arrangement: value });
                        if (value === "term_time" && schedule.offPeriods.length === 0)
                          addPeriods(termPresets);
                      }}
                    />
                    <span className="block font-medium text-foreground">{label}</span>
                    <span className="mt-0.5 block text-muted-foreground">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={schedule.repeat}
                  onCheckedChange={(v) =>
                    patchSchedule({
                      repeat: v === true,
                      onlyWeek: v === true ? null : schedule.onlyWeek,
                    })
                  }
                />
                <span>
                  <span className="font-medium text-foreground">
                    Repeat every week across the calendar
                  </span>
                  <span className="block text-muted-foreground">
                    Untick to use these hours for one week only.
                  </span>
                </span>
              </label>
              {!schedule.repeat && (
                <label className="ml-7 block text-sm text-muted-foreground">
                  Week starting
                  <Input
                    type="date"
                    className="mt-1 w-48"
                    value={schedule.onlyWeek ?? ""}
                    onChange={(e) => patchSchedule({ onlyWeek: e.target.value || null })}
                  />
                </label>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Holidays and days off</p>
                <p className="text-[0.8125rem] text-muted-foreground">
                  Hours don't apply on these dates.
                </p>
              </div>
              {schedule.offPeriods.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {schedule.offPeriods.map((p, i) => (
                    <li
                      key={`${i}-${p.label}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_9rem_9rem_auto]"
                    >
                      <Input
                        aria-label="What is it"
                        value={p.label}
                        onChange={(e) => changePeriod(i, { label: e.target.value })}
                        className="col-span-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${p.label}`}
                        className="sm:order-last"
                        onClick={() =>
                          setSchedule((s) => ({
                            ...s,
                            offPeriods: s.offPeriods.filter((_, j) => j !== i),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Input
                        type="date"
                        aria-label={`${p.label} from`}
                        value={p.start}
                        onChange={(e) =>
                          changePeriod(i, {
                            start: e.target.value,
                            end: p.end < e.target.value ? e.target.value : p.end,
                          })
                        }
                      />
                      <Input
                        type="date"
                        aria-label={`${p.label} to`}
                        min={p.start}
                        value={p.end}
                        onChange={(e) => changePeriod(i, { end: e.target.value })}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addPeriods(termPresets)}
                >
                  <CalendarClock className="mr-1.5 h-4 w-4" /> Add school holidays
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addPeriods(keyDatePresets())}
                >
                  <CalendarClock className="mr-1.5 h-4 w-4" /> Add bank holidays, Christmas &amp; Easter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addBlank("Inset day")}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Inset day
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addBlank("Holiday")}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Other dates
                </Button>
              </div>
              <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                School holidays are typical England dates for 2026/27, and bank holidays are for England
                and Wales. Check your school's calendar and change any date to match.
              </p>
            </div>
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save hours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

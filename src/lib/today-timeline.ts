// The shift as one timeline: what is scheduled, what the routines call for, and what has been logged so far.
// Pure functions, so the ordering and wording are easy to test. Times are "HH:MM" in the household's local time.

export type TimelineKind = "shift" | "schedule" | "routine" | "logged" | "medicine" | "photo";
export type TimelineState = "done" | "next" | "upcoming";

export type TimelineItem = {
  id: string;
  /** null = sometime today, shown at the top. */
  at: string | null;
  kind: TimelineKind;
  title: string;
  detail?: string | undefined;
  childName?: string | null | undefined;
  photoUrl?: string | null | undefined;
  /** Worth a second look, such as a medicine that is not safe yet. */
  attention?: boolean | undefined;
  state: TimelineState;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "3:15pm", "15:15", "7pm" -> "15:15", "19:00". Null when it isn't a time. */
export function parseClock(text: string): string | null {
  const m = text.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (min > 59) return null;
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (h > 23) return null;
  return `${pad(h)}:${pad(min)}`;
}

type Child = { name: string; school_hours?: string | null; bedtime_routine?: string | null };

/** Prompts from each child's profile: collecting them from school, then the evening routine. */
export function routineItems(children: Child[], shiftEnd: string | null): Omit<TimelineItem, "state">[] {
  const out: Omit<TimelineItem, "state">[] = [];

  // School pick-up: the last time in "8:45am – 3:15pm". Children collected at the same time share one prompt.
  const pickups = new Map<string, string[]>();
  for (const c of children) {
    const times = [...(c.school_hours ?? "").matchAll(/\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi)].map((m) => parseClock(m[0]));
    const pm = times.filter((t): t is string => !!t).at(-1);
    if (pm && minutesOf(pm) >= 12 * 60) pickups.set(pm, [...(pickups.get(pm) ?? []), c.name]);
  }
  for (const [at, names] of pickups) {
    out.push({ id: `pickup-${at}`, at, kind: "routine", title: `Collect ${names.join(" and ")} from school` });
  }

  // Evening routine lines such as "Bath 7pm, reading, lights out 7:45pm".
  for (const c of children) {
    for (const m of (c.bedtime_routine ?? "").matchAll(/([A-Za-z][A-Za-z ']*?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/g)) {
      const at = parseClock(m[2]!);
      const what = m[1]!.trim().replace(/^(then|and)\s+/i, "");
      if (!at || !what || minutesOf(at) < 15 * 60) continue;
      // Only what falls inside the shift, if the hours are known.
      if (shiftEnd && minutesOf(at) > minutesOf(shiftEnd)) continue;
      out.push({ id: `routine-${c.name}-${at}`, at, kind: "routine", title: `${what.charAt(0).toUpperCase()}${what.slice(1)}`, childName: c.name });
    }
  }
  return out;
}

type PlannerRow = {
  id: string;
  time_label: string | null;
  end_time_label: string | null;
  title: string;
  child_name: string | null;
  entry_type: string;
  status: string;
  approval?: string | null;
};
type CareRow = { id: string; kind: string; detail: string | null; amountMl: number | null; childName: string | null; at: string };
type DoseRow = { id: string; medicine: string; dose: string | null; childName: string; at: string; nextDoseFrom: string | null; nextAt: string | null };
type PhotoRow = { id: string; caption: string | null; childName: string | null; photoUrl: string | null; at: string };

export type TimelineInput = {
  now: string;
  shift: { startedAt: string; endedAt: string | null } | null;
  scheduled: { start: string; end: string } | null;
  planner: PlannerRow[];
  routines: Omit<TimelineItem, "state">[];
  care: CareRow[];
  doses: DoseRow[];
  photos: PhotoRow[];
};

const CARE_TITLES: Record<string, string> = { meal: "Meal", nap: "Nap", bottle: "Bottle", nappy: "Nappy", potty: "Potty" };

export function buildTimeline(input: TimelineInput): TimelineItem[] {
  const base: Omit<TimelineItem, "state">[] = [];

  if (input.shift) {
    base.push({ id: "shift-start", at: input.shift.startedAt, kind: "shift", title: "Shift started" });
    if (input.shift.endedAt) base.push({ id: "shift-end", at: input.shift.endedAt, kind: "shift", title: "Shift finished" });
    else if (input.scheduled) base.push({ id: "shift-due", at: input.scheduled.end, kind: "shift", title: "Shift due to end" });
  } else if (input.scheduled) {
    base.push({ id: "shift-due-start", at: input.scheduled.start, kind: "shift", title: "Shift starts" });
  }

  for (const p of input.planner) {
    if (p.entry_type === "shift") continue; // already on the timesheet
    const approval = p.approval ?? "approved";
    if (p.entry_type === "shift_change") {
      if (approval === "declined") continue;
      const pending = approval === "pending";
      const cancelled = p.status === "cancelled";
      base.push({
        id: `plan-${p.id}`,
        at: p.time_label,
        kind: "schedule",
        title: cancelled ? "Regular shift cancelled" : "Shift changed",
        detail: [p.time_label && p.end_time_label ? `${p.time_label} to ${p.end_time_label}` : null, pending ? "Waiting for approval" : null].filter(Boolean).join(" · ") || undefined,
        attention: pending,
      });
      continue;
    }
    base.push({
      id: `plan-${p.id}`,
      at: p.time_label,
      kind: "schedule",
      title: p.title,
      detail: p.end_time_label && p.time_label ? `Until ${p.end_time_label}` : undefined,
      childName: p.child_name,
    });
  }

  base.push(...input.routines);

  for (const c of input.care) {
    const what = CARE_TITLES[c.kind] ?? "Logged";
    base.push({
      id: `care-${c.id}`,
      at: c.at,
      kind: "logged",
      title: c.detail ? `${what}: ${c.detail}` : c.kind === "bottle" && c.amountMl ? `${what} ${c.amountMl}ml` : what,
      childName: c.childName,
    });
  }

  for (const d of input.doses) {
    base.push({
      id: `dose-${d.id}`,
      at: d.at,
      kind: "medicine",
      title: `${d.medicine.replace(/\s*\(.*\)$/, "")} given`,
      detail: d.dose ?? undefined,
      childName: d.childName,
    });
    // A later dose is not safe until the gap has passed: keep that in view.
    if (d.nextAt && d.nextDoseFrom && d.nextDoseFrom > input.now) {
      base.push({
        id: `dose-next-${d.id}`,
        at: d.nextAt,
        kind: "medicine",
        title: `Next ${d.medicine.replace(/\s*\(.*\)$/, "")} safe from ${d.nextAt}`,
        childName: d.childName,
        attention: true,
      });
    }
  }

  for (const ph of input.photos) {
    base.push({ id: `photo-${ph.id}`, at: ph.at, kind: "photo", title: ph.caption || "Photo", childName: ph.childName, photoUrl: ph.photoUrl });
  }

  // Everything without a time first, then in clock order.
  const sorted = [...base].sort((a, b) => {
    if (a.at === b.at) return 0;
    if (a.at === null) return -1;
    if (b.at === null) return 1;
    return minutesOf(a.at) - minutesOf(b.at);
  });

  let nextMarked = false;
  const nowMin = minutesOf(input.now);
  return sorted.map((item) => {
    const upcoming = item.at !== null && minutesOf(item.at) > nowMin && !(item.kind === "logged" || item.kind === "photo");
    if (!upcoming) return { ...item, state: "done" as const };
    if (!nextMarked) {
      nextMarked = true;
      return { ...item, state: "next" as const };
    }
    return { ...item, state: "upcoming" as const };
  });
}

/** The end-of-day message for parents, in plain words, from what was logged. */
export function summariseDay(input: {
  nannyName: string;
  shift: { startedAt: string; endedAt: string; minutes: number } | null;
  timeline: TimelineItem[];
}): string[] {
  const lines: string[] = [];
  const h = input.shift ? Math.floor(input.shift.minutes / 60) : 0;
  const m = input.shift ? input.shift.minutes % 60 : 0;
  if (input.shift) {
    lines.push(`${input.nannyName} finished at ${input.shift.endedAt} after ${h}h ${pad(m)}m.`);
  } else {
    lines.push(`${input.nannyName} is on shift today.`);
  }
  const logged = input.timeline.filter((t) => t.kind === "logged" && t.state === "done");
  const meals = logged.filter((t) => t.title.startsWith("Meal")).map((t) => t.title.replace(/^Meal:?\s*/, "").toLowerCase() || "a meal");
  if (meals.length) lines.push(`Meals logged: ${meals.join(", ")}.`);
  const photos = input.timeline.filter((t) => t.kind === "photo").length;
  if (photos) lines.push(`${photos} photo${photos === 1 ? "" : "s"} shared.`);
  for (const t of input.timeline.filter((x) => x.kind === "medicine" && !x.attention)) {
    lines.push(`${t.title}${t.childName ? ` for ${t.childName}` : ""} at ${t.at}.`);
  }
  const events = input.timeline.filter((t) => t.kind === "schedule" && t.state === "done" && t.at).map((t) => t.title);
  if (events.length) lines.push(`Today: ${events.join(", ")}.`);
  return lines;
}

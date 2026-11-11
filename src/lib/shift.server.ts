import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeAgreement } from "./agreement.model";
import { requireSharedFamily, loadNannySchedules } from "./family.server";
import { sessionAccess } from "./wallet.server";
import { offPeriodOn, regularHoursApply } from "./work-hours";
import { buildTimeline, routineItems, summariseDay, type TimelineItem } from "./today-timeline";

const ZONE = "Europe/London";
const parts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "long" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
const londonDate = (d: Date) => {
  const p = parts(d);
  return `${p["year"]}-${p["month"]}-${p["day"]}`;
};
const londonTime = (d: Date) => {
  const p = parts(d);
  return `${p["hour"]}:${p["minute"]}`;
};
const hhmm = (iso: string) => londonTime(new Date(iso));

async function who(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const session = await sessionAccess(slug);
  return { family, level: family.access, nannyId: session?.nannyId ?? null };
}

/** Everything for the Today timeline, in the household's local time. */
export async function loadToday(slug: string) {
  const me = await who(slug);
  if (!me) return null;
  const now = new Date();
  const today = londonDate(now);
  const weekday = parts(now)["weekday"]!;
  const since = new Date(now.getTime() - 36 * 3600 * 1000).toISOString();

  const [schedules, { data: children }, { data: planner }, { data: care }, { data: doses }, { data: moments }, { data: sessions }, { data: nannies }] = await Promise.all([
    loadNannySchedules(me.family.id),
    supabaseAdmin.from("family_children").select("id, name, school_hours, bedtime_routine").eq("family_id", me.family.id).order("sort_order"),
    supabaseAdmin.from("planner_entries").select("*").eq("family_id", me.family.id).eq("entry_date", today),
    supabaseAdmin.from("care_events").select("id, kind, child_id, started_at, detail, amount_ml").eq("family_id", me.family.id).gte("started_at", since),
    supabaseAdmin.from("medication_doses").select("id, medicine, dose, child_name, given_at, next_dose_from").eq("family_id", me.family.id).gte("given_at", since),
    supabaseAdmin.from("family_moments").select("id, kind, caption, child_id, storage_path, created_at").eq("family_id", me.family.id).eq("moment_date", today).eq("kind", "photo"),
    supabaseAdmin.from("shift_sessions").select("*").eq("family_id", me.family.id).gte("started_at", since).order("started_at", { ascending: false }),
    supabaseAdmin.from("family_nannies").select("id, name").eq("family_id", me.family.id).eq("status", "active").order("sort_order"),
  ]);

  // Whose day: the nanny signed in, or the household's first nanny when a parent is looking.
  const nannyId = me.nannyId ?? nannies?.[0]?.id ?? null;
  const nanny = (nannies ?? []).find((n) => n.id === nannyId);
  const schedule = schedules.find((s) => s.nannyId === nannyId) ?? schedules[0];

  // Today's scheduled window: regular hours, unless an approved change replaces or cancels them.
  let scheduled: { start: string; end: string } | null = null;
  const changes = (planner ?? []).filter((e) => e.entry_type === "shift_change" && ((e as { approval?: string }).approval ?? "approved") === "approved");
  if (!changes.some((c) => c.status === "cancelled")) {
    const changed = changes.find((c) => c.time_label && c.end_time_label);
    if (changed) scheduled = { start: changed.time_label!, end: changed.end_time_label! };
    else if (schedule && !offPeriodOn(schedule.schedule, today) && regularHoursApply(schedule.schedule, today)) {
      const day = schedule.workingDays.find((d) => d.enabled && d.day === weekday);
      if (day) scheduled = { start: day.startTime, end: day.endTime2 ?? day.endTime };
    }
  }

  const mine = (sessions ?? []).find((s) => s.nanny_id === nannyId && (londonDate(new Date(s.started_at)) === today || !s.ended_at));
  const names = new Map((children ?? []).map((c) => [c.id, c.name]));
  const shiftMinutes = mine?.ended_at ? Math.max(0, Math.round((Date.parse(mine.ended_at) - Date.parse(mine.started_at)) / 60000) - mine.break_minutes) : 0;

  const photos = await Promise.all(
    (moments ?? []).map(async (m) => {
      let photoUrl: string | null = null;
      if (slug === "demo" && m.storage_path?.startsWith("/")) photoUrl = m.storage_path;
      else if (m.storage_path) photoUrl = (await supabaseAdmin.storage.from("family-docs").createSignedUrl(m.storage_path, 300)).data?.signedUrl ?? null;
      return { id: m.id, caption: m.caption, childName: m.child_id ? (names.get(m.child_id) ?? null) : null, photoUrl, at: hhmm(m.created_at) };
    }),
  );

  // The sample wallet always shows the same lived-in after-school afternoon, whatever the real time is.
  if (slug === "demo") return demoToday(me.level, nanny?.name, today, (children ?? []).map((c) => ({ id: c.id, name: c.name, school_hours: c.school_hours, bedtime_routine: c.bedtime_routine })));

  const nowHHMM = londonTime(now);
  const timeline: TimelineItem[] = buildTimeline({
    now: nowHHMM,
    shift: mine ? { startedAt: hhmm(mine.started_at), endedAt: mine.ended_at ? hhmm(mine.ended_at) : null } : null,
    scheduled,
    planner: (planner ?? []) as never,
    routines: routineItems(children ?? [], scheduled?.end ?? null),
    care: (care ?? [])
      .filter((c) => londonDate(new Date(c.started_at)) === today)
      .map((c) => ({ id: c.id, kind: c.kind, detail: c.detail, amountMl: c.amount_ml, childName: c.child_id ? (names.get(c.child_id) ?? null) : null, at: hhmm(c.started_at) })),
    doses: (doses ?? [])
      .filter((d) => londonDate(new Date(d.given_at)) === today)
      .map((d) => ({ id: d.id, medicine: d.medicine, dose: d.dose, childName: d.child_name, at: hhmm(d.given_at), nextAt: d.next_dose_from && londonDate(new Date(d.next_dose_from)) === today ? hhmm(d.next_dose_from) : null })),
    photos,
  });

  const firstName = (nanny?.name ?? "Your nanny").split(" ")[0]!;
  const summary =
    mine?.ended_at
      ? summariseDay({ nannyName: firstName, shift: { startedAt: hhmm(mine.started_at), endedAt: hhmm(mine.ended_at), minutes: shiftMinutes }, timeline })
      : null;

  return {
    access: me.level,
    nannyName: firstName,
    today,
    now: nowHHMM,
    scheduled,
    shift: mine ? { open: !mine.ended_at, startedAt: hhmm(mine.started_at), endedAt: mine.ended_at ? hhmm(mine.ended_at) : null, minutes: shiftMinutes } : null,
    children: (children ?? []).map((c) => ({ id: c.id, name: c.name })),
    timeline,
    summary,
  };
}

type DemoChild = { id: string; name: string; school_hours: string | null; bedtime_routine: string | null };

async function demoToday(access: "family" | "nanny", nannyName: string | undefined, today: string, children: DemoChild[]) {
  const { AFTER_SCHOOL_DAY, DEMO_CARE, DEMO_DOSE, DEMO_NOW, DEMO_PLAN, DEMO_SHIFT } = await import("./demo-photos");
  const timeline = buildTimeline({
    now: DEMO_NOW,
    shift: { startedAt: DEMO_SHIFT.startedAt, endedAt: null },
    scheduled: { start: DEMO_SHIFT.start, end: DEMO_SHIFT.end },
    planner: [
      ...DEMO_PLAN.map((e, i) => ({ id: `demo-plan-${i}`, time_label: e.time, end_time_label: e.end ?? null, title: e.title, child_name: e.child, entry_type: e.type, status: "active" })),
      // Text updates from Jess (homework and so on) sit in the day as notes.
      ...AFTER_SCHOOL_DAY.filter((p) => !p.photo).map((p, i) => ({ id: `demo-note-${i}`, time_label: p.time, end_time_label: null, title: `${p.milestone ?? "Update"}: ${p.caption}`, child_name: p.child, entry_type: "note", status: "active" })),
    ],
    routines: routineItems(children, DEMO_SHIFT.end),
    care: DEMO_CARE.map((c, i) => ({ id: `demo-care-${i}`, kind: "meal", detail: c.detail, amountMl: null, childName: c.child, at: c.time })),
    doses: [{ id: "demo-dose", medicine: DEMO_DOSE.medicine, dose: DEMO_DOSE.dose, childName: DEMO_DOSE.child, at: DEMO_DOSE.time, nextAt: DEMO_DOSE.nextAt }],
    photos: AFTER_SCHOOL_DAY.filter((p) => p.photo).map((p, i) => ({ id: `demo-photo-${i}`, caption: p.caption, childName: p.child, photoUrl: p.photo ?? null, at: p.time })),
  });
  return {
    access,
    nannyName: (nannyName ?? "Jess").split(" ")[0]!,
    today,
    now: DEMO_NOW,
    scheduled: { start: DEMO_SHIFT.start, end: DEMO_SHIFT.end },
    shift: { open: true, startedAt: DEMO_SHIFT.startedAt, endedAt: null as string | null, minutes: 0 },
    children: children.map((c) => ({ id: c.id, name: c.name })),
    timeline,
    summary: null as string[] | null,
  };
}

export async function startShift(slug: string) {
  const me = await who(slug);
  if (!me || me.level !== "nanny" || !me.nannyId) throw new Error("Only your nanny can start a shift.");
  const { error } = await supabaseAdmin.from("shift_sessions").insert({ family_id: me.family.id, nanny_id: me.nannyId });
  if (error) {
    if (error.code === "23505") throw new Error("Your shift has already started.");
    throw new Error("Couldn't start the shift.");
  }
  await (await import("./notifications.server")).notifyOther(me.family, "today", "Your nanny started their shift");
  return { ok: true as const };
}

/** Ends the shift and puts the hours on the timesheet for the parent to approve. */
export async function endShift(slug: string, breakMinutes = 0) {
  const me = await who(slug);
  if (!me || me.level !== "nanny" || !me.nannyId) throw new Error("Only your nanny can end a shift.");
  const { data: open } = await supabaseAdmin.from("shift_sessions").select("*").eq("family_id", me.family.id).eq("nanny_id", me.nannyId).is("ended_at", null).maybeSingle();
  if (!open) throw new Error("There's no shift in progress.");

  const ended = new Date();
  const started = new Date(open.started_at);
  const brk = Math.max(0, Math.min(720, Math.round(Number(breakMinutes) || 0)));
  const worked = Math.round((ended.getTime() - started.getTime()) / 60000) - brk;
  if (worked < 1) throw new Error("That shift is too short to record. Check the break time.");

  // Agreed hourly rate, so the timesheet line is priced.
  const { data: agreement } = await supabaseAdmin.from("nanny_agreements").select("agreement_data").eq("family_id", me.family.id).eq("nanny_id", me.nannyId).maybeSingle();
  const rate = agreement ? Number(normalizeAgreement(agreement.agreement_data).hourlyRate) || 0 : 0;

  const { submitShift } = await import("./work-tools.server");
  const line = await submitShift(slug, {
    shiftDate: londonDate(started),
    startTime: londonTime(started),
    endTime: londonTime(ended),
    breakMinutes: brk,
    isOvernight: londonDate(ended) !== londonDate(started),
    hourlyRate: rate,
    notes: "Recorded with Start and End shift",
    shiftType: "nanny",
  });
  const { error } = await supabaseAdmin
    .from("shift_sessions")
    .update({ ended_at: ended.toISOString(), break_minutes: brk, timesheet_shift_id: line?.id ?? null })
    .eq("id", open.id);
  if (error) throw new Error("Couldn't end the shift.");
  return { ok: true as const, minutes: worked };
}

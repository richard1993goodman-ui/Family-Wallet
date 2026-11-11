import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { familyHasFeature } from "./plan-access.server";
import { DEFAULT_LIVE_IN, mondayOf, type LiveInData, type LiveInSettings } from "./live-in.types";

async function load(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  if (!(await familyHasFeature(family.id, "live_in"))) throw new Error("Live-in tools are not available on this plan.");
  return family;
}

export async function loadLiveIn(slug: string): Promise<LiveInData | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  if (!(await familyHasFeature(family.id, "live_in"))) return { upgrade: true, access: family.access };
  const [{ data: s }, { data: w }] = await Promise.all([
    supabaseAdmin.from("live_in_settings").select("*").eq("family_id", family.id).maybeSingle(),
    supabaseAdmin.from("live_in_weeks").select("*").eq("family_id", family.id).order("week_start", { ascending: false }).limit(26),
  ]);
  const settings: LiveInSettings = s
    ? {
        weeklyPocketMoney: Number(s.weekly_pocket_money),
        maxWeeklyHours: Number(s.max_weekly_hours),
        daysOffPerWeek: s.days_off_per_week,
        roomAndBoard: s.room_and_board ?? "",
        houseRules: s.house_rules ?? "",
        studySchedule: s.study_schedule ?? "",
      }
    : DEFAULT_LIVE_IN;
  return {
    access: family.access,
    settings,
    weeks: (w ?? []).map((r) => ({
      id: r.id,
      weekStart: r.week_start,
      hoursWorked: Number(r.hours_worked),
      daysOff: r.days_off,
      pocketMoneyPaid: r.pocket_money_paid,
      note: r.note,
    })),
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
const txt = (v: string) => v.trim().slice(0, 2000) || null;

export async function saveLiveInSettings(slug: string, s: LiveInSettings) {
  const family = await load(slug);
  if (family.access !== "family") throw new Error("Only parents can change the live-in arrangement.");
  const { error } = await supabaseAdmin.from("live_in_settings").upsert({
    family_id: family.id,
    weekly_pocket_money: clamp(s.weeklyPocketMoney, 0, 2000),
    max_weekly_hours: clamp(s.maxWeeklyHours, 0, 80),
    days_off_per_week: Math.round(clamp(s.daysOffPerWeek, 0, 7)),
    room_and_board: txt(s.roomAndBoard),
    house_rules: txt(s.houseRules),
    study_schedule: txt(s.studySchedule),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Couldn't save the arrangement.");
  await (await import("./notifications.server")).notifyOther(family, "livein", "Live-in arrangement updated");
}

export async function logLiveInWeek(slug: string, week: { weekStart: string; hoursWorked: number; daysOff: number; note: string }) {
  const family = await load(slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week.weekStart)) throw new Error("Choose a week.");
  const { error } = await supabaseAdmin.from("live_in_weeks").upsert(
    {
      family_id: family.id,
      week_start: mondayOf(week.weekStart),
      hours_worked: clamp(week.hoursWorked, 0, 100),
      days_off: Math.round(clamp(week.daysOff, 0, 7)),
      note: txt(week.note),
    },
    { onConflict: "family_id,week_start" },
  );
  if (error) throw new Error("Couldn't save that week.");
  await (await import("./notifications.server")).notifyOther(family, "livein", "Live-in week logged");
}

export async function markPocketMoneyPaid(slug: string, id: string, paid: boolean) {
  const family = await load(slug);
  if (family.access !== "family") throw new Error("Only parents can mark pocket money as paid.");
  const { error } = await supabaseAdmin.from("live_in_weeks").update({ pocket_money_paid: paid }).eq("id", id).eq("family_id", family.id);
  if (error) throw new Error("Couldn't update that week.");
  await (await import("./notifications.server")).notifyOther(family, "livein", "Pocket money updated");
}

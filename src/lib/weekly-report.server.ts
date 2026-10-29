import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Monday-to-Sunday week containing `anchor` (UTC). */
export function weekRange(anchor?: string) {
  const base = anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? new Date(`${anchor}T00:00:00Z`) : new Date();
  const day = (base.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - day));
  const end = new Date(start.getTime() + 6 * 86400000);
  return { start: iso(start), end: iso(end) };
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export async function loadWeeklyReport(slug: string, anchor?: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { start, end } = weekRange(anchor);
  const fid = family.id;

  const [handovers, expenses, shifts, planner, passport, meds, logs, leave] = await Promise.all([
    supabaseAdmin.from("handover_checklists").select("handover_date, homework_status, dinner_status, mood, energy, reading_done, tomorrow_notes, submitted_by_name").eq("family_id", fid).gte("handover_date", start).lte("handover_date", end).order("handover_date"),
    supabaseAdmin.from("expense_claims").select("expense_date, item, amount, status").eq("family_id", fid).gte("expense_date", start).lte("expense_date", end).order("expense_date"),
    supabaseAdmin.from("timesheet_shifts").select("shift_date, start_time, end_time, break_minutes, is_overnight, hourly_rate, status, shift_type").eq("family_id", fid).gte("shift_date", start).lte("shift_date", end).order("shift_date"),
    supabaseAdmin.from("planner_entries").select("entry_date, time_label, title, child_name, entry_type, status").eq("family_id", fid).gte("entry_date", start).lte("entry_date", end).order("entry_date"),
    supabaseAdmin.from("sports_passport_entries").select("entry_date, child_name, activity, minutes, badge, confidence_level").eq("family_id", fid).gte("entry_date", start).lte("entry_date", end).order("entry_date"),
    supabaseAdmin.from("medication_doses").select("given_at, child_name, medicine, dose, given_by_name").eq("family_id", fid).gte("given_at", `${start}T00:00:00Z`).lte("given_at", `${end}T23:59:59Z`).order("given_at"),
    supabaseAdmin.from("daily_logs").select("log_date, activities, mood, notes").eq("family_id", fid).gte("log_date", start).lte("log_date", end).order("log_date"),
    supabaseAdmin.from("leave_requests").select("leave_type, start_date, end_date, days, status").eq("family_id", fid).lte("start_date", end).gte("end_date", start),
  ]);

  const shiftRows = (shifts.data ?? []).map((s) => {
    let mins = toMinutes(s.end_time) - toMinutes(s.start_time);
    if (mins < 0 || s.is_overnight) mins += mins < 0 ? 1440 : 0;
    mins = Math.max(0, mins - Number(s.break_minutes ?? 0));
    return { ...s, hours: mins / 60, pay: (mins / 60) * Number(s.hourly_rate ?? 0) };
  });
  const passportRows = passport.data ?? [];
  const expenseRows = expenses.data ?? [];

  return {
    access: family.access,
    familyName: family.family_name,
    week: { start, end },
    stats: {
      hours: shiftRows.filter((s) => s.shift_type !== "babysitting").reduce((a, s) => a + s.hours, 0),
      approvedPay: shiftRows.filter((s) => s.status === "approved" && s.shift_type !== "babysitting").reduce((a, s) => a + s.pay, 0),
      pendingShifts: shiftRows.filter((s) => s.status !== "approved").length,
      babysittingHours: shiftRows.filter((s) => s.shift_type === "babysitting").reduce((a, s) => a + s.hours, 0),
      babysittingPay: shiftRows.filter((s) => s.shift_type === "babysitting" && s.status === "approved").reduce((a, s) => a + s.pay, 0),
      activeMinutes: passportRows.reduce((a, p) => a + Number(p.minutes ?? 0), 0),
      badges: passportRows.filter((p) => p.badge).length,
      handovers: (handovers.data ?? []).length,
      expensesTotal: expenseRows.reduce((a, e) => a + Number(e.amount ?? 0), 0),
      expensesPending: expenseRows.filter((e) => e.status === "pending").reduce((a, e) => a + Number(e.amount ?? 0), 0),
      doses: (meds.data ?? []).length,
    },
    shifts: shiftRows,
    handovers: handovers.data ?? [],
    expenses: expenseRows,
    planner: planner.data ?? [],
    passport: passportRows,
    medication: meds.data ?? [],
    logs: logs.data ?? [],
    leave: leave.data ?? [],
  };
}

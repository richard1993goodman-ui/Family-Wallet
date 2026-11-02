import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calculateHoliday, rotaWeek2, normalizeAgreement, type WorkingDay } from "./agreement.model";
import { requireSharedFamily } from "./family.server";
import { listNannyRows } from "./wallet.server";

export type LeaveType = "holiday" | "sick" | "unpaid" | "other";
export type LeaveStatus = "pending" | "approved" | "declined";

export type LeaveInput = {
  nannyId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  notes?: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The UK leave year we track runs 1 April to 31 March. */
export function leaveYearBounds(reference = new Date()) {
  const year = reference.getUTCMonth() >= 3 ? reference.getUTCFullYear() : reference.getUTCFullYear() - 1;
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    label: `1 Apr ${year} – 31 Mar ${year + 1}`,
  };
}

/** How many of the nanny's agreed working days fall inside the requested dates. */
export function countLeaveDays(startDate: string, endDate: string, workingDays: WorkingDay[]) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const enabled = new Set(
    workingDays.filter((d) => d.enabled).map((d) => d.day.toLowerCase()),
  );
  let days = 0;
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const name = DAY_NAMES[cursor.getUTCDay()]!.toLowerCase();
    if (enabled.size === 0 ? cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6 : enabled.has(name)) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return days;
}

async function schedulesWithEntitlement(familyId: string) {
  const [rows, { data: agreements }] = await Promise.all([
    listNannyRows(familyId),
    supabaseAdmin
      .from("nanny_agreements")
      .select("nanny_id, agreement_data")
      .eq("family_id", familyId),
  ]);
  return rows.map((row) => {
    const agreementRow = (agreements ?? []).find((a) => a.nanny_id === row.id);
    const agreement = agreementRow ? normalizeAgreement(agreementRow.agreement_data) : null;
    const workingDays = agreement?.workingDays ?? [];
    const holiday = agreement
      ? calculateHoliday(workingDays, agreement.contractType, agreement.weeksPerYear, rotaWeek2(agreement))
      : null;
    return {
      nannyId: row.id,
      nannyName: row.name,
      workingDays,
      hasAgreement: Boolean(agreement),
      entitlementDays: holiday?.totalDaysEntitlement ?? 0,
      entitlementWeeks: holiday?.totalWeeksEntitlement ?? 0,
      workingDaysPerWeek: holiday?.workingDaysPerWeek ?? 0,
      contractType: holiday?.contractType ?? "year-round",
    };
  });
}

export async function loadLeave(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const year = leaveYearBounds();

  const [nannies, { data: requests }] = await Promise.all([
    schedulesWithEntitlement(family.id),
    supabaseAdmin
      .from("leave_requests")
      .select("id, nanny_id, leave_type, start_date, end_date, days, notes, status, requested_by, created_at")
      .eq("family_id", family.id)
      .gte("start_date", year.start)
      .lte("start_date", year.end)
      .order("start_date", { ascending: false }),
  ]);

  const rows = requests ?? [];

  return {
    access: family.access,
    familyName: family.family_name,
    leaveYear: year,
    nannies: nannies.map((n) => {
      const mine = rows.filter((r) => r.nanny_id === n.nannyId);
      const taken = mine
        .filter((r) => r.status === "approved" && r.leave_type === "holiday")
        .reduce((sum, r) => sum + Number(r.days), 0);
      const pending = mine
        .filter((r) => r.status === "pending" && r.leave_type === "holiday")
        .reduce((sum, r) => sum + Number(r.days), 0);
      const sickDays = mine
        .filter((r) => r.status === "approved" && r.leave_type === "sick")
        .reduce((sum, r) => sum + Number(r.days), 0);
      return {
        ...n,
        takenDays: Number(taken.toFixed(1)),
        pendingDays: Number(pending.toFixed(1)),
        sickDays: Number(sickDays.toFixed(1)),
        remainingDays: Number((n.entitlementDays - taken).toFixed(1)),
      };
    }),
    requests: rows.map((r) => ({
      id: r.id,
      nannyId: r.nanny_id,
      nannyName: nannies.find((n) => n.nannyId === r.nanny_id)?.nannyName ?? "Nanny",
      leaveType: r.leave_type as LeaveType,
      startDate: r.start_date,
      endDate: r.end_date,
      days: Number(r.days),
      notes: r.notes,
      status: r.status as LeaveStatus,
      requestedBy: r.requested_by,
    })),
  };
}

export async function requestLeave(slug: string, input: LeaveInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const nannies = await schedulesWithEntitlement(family.id);
  const nanny = nannies.find((n) => n.nannyId === input.nannyId);
  if (!nanny) throw new Error("Choose which nanny this leave is for.");

  const days = countLeaveDays(input.startDate, input.endDate, nanny.workingDays);
  if (days === 0) throw new Error("Those dates do not include any agreed working days.");

  const { error } = await supabaseAdmin.from("leave_requests").insert({
    family_id: family.id,
    nanny_id: nanny.nannyId,
    leave_type: input.leaveType,
    start_date: input.startDate,
    end_date: input.endDate,
    days,
    notes: input.notes?.trim().slice(0, 1000) || null,
    requested_by: family.access,
    // A parent booking leave for their nanny is already agreed.
    status: family.access === "family" ? "approved" : "pending",
    reviewed_at: family.access === "family" ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);
  if (family.access === "family") await addLeaveToPlanner(family.id, nanny.nannyName, input, days);
  return { days, autoApproved: family.access === "family" };
}

async function addLeaveToPlanner(
  familyId: string,
  nannyName: string,
  input: LeaveInput,
  days: number,
) {
  await supabaseAdmin.from("planner_entries").insert({
    family_id: familyId,
    entry_date: input.startDate,
    title: `${nannyName} on ${input.leaveType === "sick" ? "sick leave" : "leave"}`,
    entry_type: "leave",
    added_by: "family",
    notes: `${days} day${days === 1 ? "" : "s"} to ${input.endDate}`,
  });
}

export async function reviewLeave(slug: string, id: string, status: "approved" | "declined") {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can approve leave.");
  const { data: row, error } = await supabaseAdmin
    .from("leave_requests")
    .update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", family.id)
    .select("nanny_id, leave_type, start_date, end_date, days")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (row && status === "approved") {
    const nannies = await schedulesWithEntitlement(family.id);
    const name = nannies.find((n) => n.nannyId === row.nanny_id)?.nannyName ?? "Nanny";
    await addLeaveToPlanner(
      family.id,
      name,
      {
        nannyId: row.nanny_id ?? "",
        leaveType: row.leave_type as LeaveType,
        startDate: row.start_date,
        endDate: row.end_date,
      },
      Number(row.days),
    );
  }
}

export async function cancelLeave(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const { error } = await supabaseAdmin
    .from("leave_requests")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { listNannyRows, sessionAccess } from "./wallet.server";
import type { ExpenseInput, HandoverInput, PassportInput } from "./passport-handover.types";

const MAX_TEXT = 1200;

function clean(value: string | undefined | null, max = MAX_TEXT) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanDate(value: string | undefined | null) {
  const trimmed = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : new Date().toISOString().slice(0, 10);
}

async function actor(slug: string, familyId: string, familyName: string) {
  const session = await sessionAccess(slug);
  const nannies = await listNannyRows(familyId);
  const activeNanny = session?.nannyId ? nannies.find((n) => n.id === session.nannyId) : null;
  return {
    nannies,
    nannyId: session?.level === "nanny" ? (activeNanny?.id ?? null) : null,
    name: session?.level === "nanny" ? (activeNanny?.name ?? "Nanny") : familyName,
  };
}

async function validNannyId(familyId: string, requested: string | undefined | null) {
  if (!requested) return null;
  const rows = await listNannyRows(familyId);
  return rows.some((row) => row.id === requested) ? requested : null;
}

export async function loadPassport(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [{ data: children }, { data: entries }] = await Promise.all([
    supabaseAdmin
      .from("family_children")
      .select("name")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("sports_passport_entries")
      .select(
        "id, child_name, activity, skill_area, confidence_level, effort_level, minutes, badge, notes, logged_by, logged_by_name, entry_date, created_at",
      )
      .eq("family_id", family.id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const rows = entries ?? [];
  const childNames = (children ?? []).map((child) => child.name);
  const totalMinutes = rows.reduce((sum, row) => sum + Number(row.minutes ?? 0), 0);
  const badges = new Set(rows.map((row) => row.badge).filter(Boolean));

  return {
    access: family.access,
    familyName: family.family_name,
    children: childNames,
    stats: {
      entries: rows.length,
      minutes: totalMinutes,
      badges: badges.size,
    },
    entries: rows.map((row) => ({
      id: row.id,
      childName: row.child_name,
      activity: row.activity,
      skillArea: row.skill_area,
      confidenceLevel: row.confidence_level,
      effortLevel: row.effort_level,
      minutes: row.minutes,
      badge: row.badge,
      notes: row.notes,
      loggedBy: row.logged_by,
      loggedByName: row.logged_by_name,
      entryDate: row.entry_date,
      createdAt: row.created_at,
    })),
  };
}

export async function addPassportEntry(slug: string, input: PassportInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const childName = clean(input.childName, 120);
  const activity = clean(input.activity, 160);
  if (!childName) throw new Error("Choose which child this is for.");
  if (!activity) throw new Error("Add the activity or skill.");
  const actorData = await actor(slug, family.id, family.family_name);
  const confidenceLevel = Math.min(5, Math.max(1, Math.round(Number(input.confidenceLevel) || 3)));
  const effortLevel = Math.min(5, Math.max(1, Math.round(Number(input.effortLevel) || 3)));
  const minutes = Math.min(600, Math.max(0, Math.round(Number(input.minutes) || 0)));

  const { data, error } = await supabaseAdmin
    .from("sports_passport_entries")
    .insert({
      family_id: family.id,
      child_name: childName,
      activity,
      skill_area: clean(input.skillArea, 60) ?? "general",
      confidence_level: confidenceLevel,
      effort_level: effortLevel,
      minutes,
      badge: clean(input.badge, 80),
      notes: clean(input.notes, 1000),
      logged_by: family.access,
      logged_by_name: actorData.name,
      entry_date: cleanDate(input.entryDate),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deletePassportEntry(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can remove passport entries.");
  const { error } = await supabaseAdmin
    .from("sports_passport_entries")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function loadHandover(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const nannies = await listNannyRows(family.id);
  const [{ data: handovers }, { data: expenses }] = await Promise.all([
    supabaseAdmin
      .from("handover_checklists")
      .select(
        "id, nanny_id, handover_date, homework_status, dinner_status, water_status, mood, energy, school_bag_ready, pe_kit_ready, reading_done, tomorrow_notes, parent_notes, submitted_by, submitted_by_name, created_at",
      )
      .eq("family_id", family.id)
      .order("handover_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("expense_claims")
      .select(
        "id, nanny_id, expense_date, item, amount, category, notes, status, submitted_by, submitted_by_name, reviewed_at, created_at",
      )
      .eq("family_id", family.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const pendingTotal = (expenses ?? [])
    .filter((expense) => expense.status === "pending")
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);

  return {
    access: family.access,
    familyName: family.family_name,
    nannies: nannies.map((nanny) => ({ id: nanny.id, name: nanny.name })),
    handovers: (handovers ?? []).map((row) => ({
      id: row.id,
      nannyId: row.nanny_id,
      nannyName: nannies.find((nanny) => nanny.id === row.nanny_id)?.name ?? row.submitted_by_name ?? "Nanny",
      handoverDate: row.handover_date,
      homeworkStatus: row.homework_status,
      dinnerStatus: row.dinner_status,
      waterStatus: row.water_status,
      mood: row.mood,
      energy: row.energy,
      schoolBagReady: row.school_bag_ready,
      peKitReady: row.pe_kit_ready,
      readingDone: row.reading_done,
      tomorrowNotes: row.tomorrow_notes,
      parentNotes: row.parent_notes,
      submittedBy: row.submitted_by,
      submittedByName: row.submitted_by_name,
      createdAt: row.created_at,
    })),
    expenses: (expenses ?? []).map((row) => ({
      id: row.id,
      nannyId: row.nanny_id,
      nannyName: nannies.find((nanny) => nanny.id === row.nanny_id)?.name ?? row.submitted_by_name ?? "Nanny",
      expenseDate: row.expense_date,
      item: row.item,
      amount: Number(row.amount),
      category: row.category,
      notes: row.notes,
      status: row.status,
      submittedBy: row.submitted_by,
      submittedByName: row.submitted_by_name,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
    })),
    pendingTotal: Number(pendingTotal.toFixed(2)),
  };
}

export async function saveHandover(slug: string, input: HandoverInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const actorData = await actor(slug, family.id, family.family_name);
  const nannyId = family.access === "nanny" ? actorData.nannyId : await validNannyId(family.id, input.nannyId);

  const { data, error } = await supabaseAdmin
    .from("handover_checklists")
    .insert({
      family_id: family.id,
      nanny_id: nannyId,
      handover_date: cleanDate(input.handoverDate),
      homework_status: clean(input.homeworkStatus, 180),
      dinner_status: clean(input.dinnerStatus, 180),
      water_status: clean(input.waterStatus, 120),
      mood: clean(input.mood, 80),
      energy: clean(input.energy, 80),
      school_bag_ready: Boolean(input.schoolBagReady),
      pe_kit_ready: Boolean(input.peKitReady),
      reading_done: Boolean(input.readingDone),
      tomorrow_notes: clean(input.tomorrowNotes, 1000),
      parent_notes: clean(input.parentNotes, 1000),
      submitted_by: family.access,
      submitted_by_name: actorData.name,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "handover", "Handover notes updated");
  return { id: data.id };
}

export async function deleteHandover(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can remove handovers.");
  const { error } = await supabaseAdmin
    .from("handover_checklists")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function addExpense(slug: string, input: ExpenseInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  const item = clean(input.item, 160);
  if (!item) throw new Error("Add what the expense was for.");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Add a valid amount.");
  const actorData = await actor(slug, family.id, family.family_name);
  const nannyId = family.access === "nanny" ? actorData.nannyId : await validNannyId(family.id, input.nannyId);

  const { data, error } = await supabaseAdmin
    .from("expense_claims")
    .insert({
      family_id: family.id,
      nanny_id: nannyId,
      expense_date: cleanDate(input.expenseDate),
      item,
      amount: Number(amount.toFixed(2)),
      category: clean(input.category, 60) ?? "other",
      notes: clean(input.notes, 1000),
      status: family.access === "family" ? "reimbursed" : "pending",
      submitted_by: family.access,
      submitted_by_name: actorData.name,
      reviewed_at: family.access === "family" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "handover", "New expense claim");
  return { id: data.id };
}

export async function reviewExpense(slug: string, id: string, status: "reimbursed" | "declined") {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can update expenses.");
  const { error } = await supabaseAdmin
    .from("expense_claims")
    .update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
  await (await import("./notifications.server")).notifyOther(family, "handover", "An expense claim was updated");
}

export async function deleteExpense(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can remove expenses.");
  const { error } = await supabaseAdmin
    .from("expense_claims")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

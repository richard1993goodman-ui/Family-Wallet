import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { accessLevel, isUnlocked, listNannyRows, sessionAccess } from "./wallet.server";
import { normalizeAgreement, type WorkingDay } from "./agreement.model";

const MAX_CHILDREN = 8;
const MAX_TEXT = 4000;

function clean(value: string | undefined | null, max = MAX_TEXT) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function requireFamily(slug: string) {
  if (!(await isUnlocked(slug))) return null;
  const { data } = await supabaseAdmin
    .from("families")
    .select("id, family_name, nanny_name, start_date")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

export async function requireSharedFamily(slug: string) {
  const access = await accessLevel(slug);
  if (!access) return null;
  const { data } = await supabaseAdmin
    .from("families")
    .select("id, family_name, nanny_name, start_date")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data ? { ...data, access } : null;
}

/* ---------------- Family profile & children ---------------- */

export type ChildInput = {
  id?: string;
  name: string;
  dateOfBirth?: string;
  school?: string;
  yearGroup?: string;
  schoolHours?: string;
  allergies?: string;
  dietary?: string;
  medication?: string;
  personality?: string;
  interests?: string;
  dislikes?: string;
  morningRoutine?: string;
  bedtimeRoutine?: string;
  whatMakesThemTick?: string;
};

export type ProfileInput = {
  homeAddress?: string;
  importantAddresses?: string;
  houseRules?: string;
  screenTimeRules?: string;
  homeworkExpectations?: string;
  gpDetails?: string;
  medicalNotes?: string;
  emergencyInstructions?: string;
};

export async function loadFamilyProfile(slug: string) {
  const family = await requireFamily(slug);
  if (!family) return null;

  const [{ data: profile }, { data: children }, { data: contacts }] = await Promise.all([
    supabaseAdmin.from("family_profile").select("*").eq("family_id", family.id).maybeSingle(),
    supabaseAdmin
      .from("family_children")
      .select("*")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("family_contacts")
      .select("name, relationship, phone")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true }),
  ]);

  const rows = children ?? [];
  const withPhotos = await Promise.all(
    rows.map(async (child) => {
      let photoUrl: string | null = null;
      if (child.photo_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("family-docs")
          .createSignedUrl(child.photo_path, 300);
        photoUrl = signed?.signedUrl ?? null;
      }
      return { ...child, photoUrl };
    }),
  );

  return {
    familyName: family.family_name,
    nannyName: family.nanny_name,
    profile: profile ?? null,
    children: withPhotos,
    contacts: contacts ?? [],
  };
}

export async function saveFamilyProfile(slug: string, input: ProfileInput) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Locked");
  const { error } = await supabaseAdmin.from("family_profile").upsert(
    {
      family_id: family.id,
      home_address: clean(input.homeAddress, 500),
      important_addresses: clean(input.importantAddresses),
      house_rules: clean(input.houseRules),
      screen_time_rules: clean(input.screenTimeRules),
      homework_expectations: clean(input.homeworkExpectations),
      gp_details: clean(input.gpDetails, 500),
      medical_notes: clean(input.medicalNotes),
      emergency_instructions: clean(input.emergencyInstructions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "family_id" },
  );
  if (error) throw new Error(error.message);
}

export async function saveEmergencyProfile(
  slug: string,
  input: {
    homeAddress?: string;
    gpDetails?: string;
    medicalNotes?: string;
    emergencyInstructions?: string;
  },
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change emergency details");
  const { error } = await supabaseAdmin.from("family_profile").upsert(
    {
      family_id: family.id,
      home_address: clean(input.homeAddress, 500),
      gp_details: clean(input.gpDetails, 500),
      medical_notes: clean(input.medicalNotes),
      emergency_instructions: clean(input.emergencyInstructions),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "family_id" },
  );
  if (error) throw new Error(error.message);
}

export async function addFamilyContact(
  slug: string,
  input: { name: string; relationship?: string; phone: string },
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change emergency contacts");
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 60);
  if (!name || !phone) throw new Error("Please add a name and phone number");
  const { count } = await supabaseAdmin
    .from("family_contacts")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family.id);
  if ((count ?? 0) >= 3) throw new Error("Up to 3 family emergency contacts can be added");
  const { error } = await supabaseAdmin.from("family_contacts").insert({
    family_id: family.id,
    name,
    relationship: clean(input.relationship, 80),
    phone,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);
}

export async function deleteFamilyContact(slug: string, id: string) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change emergency contacts");
  const { error } = await supabaseAdmin
    .from("family_contacts")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function updateFamilyContact(
  slug: string,
  input: { id: string; name: string; relationship?: string; phone: string },
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change emergency contacts");
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 60);
  if (!name || !phone) throw new Error("Please add a name and phone number");
  const { error } = await supabaseAdmin
    .from("family_contacts")
    .update({ name, relationship: clean(input.relationship, 80), phone })
    .eq("id", input.id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function saveNannyEmergencyContact(
  slug: string,
  input: { nannyId: string; name?: string; relationship?: string; phone?: string },
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Only the family can change emergency contacts");
  const { error } = await supabaseAdmin
    .from("family_nannies")
    .update({
      emergency_name: clean(input.name, 80),
      emergency_relationship: clean(input.relationship, 80),
      emergency_phone: clean(input.phone, 60),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.nannyId)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function saveChild(slug: string, input: ChildInput) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Locked");
  const name = clean(input.name, 80);
  if (!name) throw new Error("Please add a name");

  const row = {
    family_id: family.id,
    name,
    date_of_birth: input.dateOfBirth || null,
    school: clean(input.school, 160),
    year_group: clean(input.yearGroup, 60),
    school_hours: clean(input.schoolHours, 120),
    allergies: clean(input.allergies, 1000),
    dietary: clean(input.dietary, 1000),
    medication: clean(input.medication, 1000),
    personality: clean(input.personality, 1000),
    interests: clean(input.interests, 1000),
    dislikes: clean(input.dislikes, 1000),
    morning_routine: clean(input.morningRoutine, 1000),
    bedtime_routine: clean(input.bedtimeRoutine, 1000),
    what_makes_them_tick: clean(input.whatMakesThemTick, 1000),
  };

  if (input.id) {
    const { error } = await supabaseAdmin
      .from("family_children")
      .update(row)
      .eq("id", input.id)
      .eq("family_id", family.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }

  const { count } = await supabaseAdmin
    .from("family_children")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family.id);
  if ((count ?? 0) >= MAX_CHILDREN) throw new Error("Up to 8 children per family");

  const { data, error } = await supabaseAdmin
    .from("family_children")
    .insert({ ...row, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteChild(slug: string, id: string) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Locked");
  const { error } = await supabaseAdmin
    .from("family_children")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function uploadChildPhoto(
  slug: string,
  childId: string,
  fileName: string,
  contentType: string,
  base64: string,
) {
  const family = await requireFamily(slug);
  if (!family) throw new Error("Locked");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("Photo must be under 8MB");
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${family.id}/child-${childId}-${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("family-docs")
    .upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await supabaseAdmin
    .from("family_children")
    .update({ photo_path: path })
    .eq("id", childId)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

/* ---------------- Weekly planner ---------------- */

export type NannySchedule = { nannyId: string; nannyName: string; workingDays: WorkingDay[] };

/** Each nanny's agreed days come from their own agreement. */
export async function loadNannySchedules(familyId: string): Promise<NannySchedule[]> {
  const [rows, { data: agreements }] = await Promise.all([
    listNannyRows(familyId),
    supabaseAdmin.from("nanny_agreements").select("nanny_id, agreement_data").eq("family_id", familyId),
  ]);
  return rows.map((row) => {
    const agreement = (agreements ?? []).find((a) => a.nanny_id === row.id);
    return {
      nannyId: row.id,
      nannyName: row.name,
      workingDays: agreement ? normalizeAgreement(agreement.agreement_data).workingDays : [],
    };
  });
}

export async function loadPlanner(slug: string, weekStart: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const endStr = end.toISOString().slice(0, 10);

  const [{ data }, schedules] = await Promise.all([
    supabaseAdmin
      .from("planner_entries")
      .select("id, entry_date, time_label, end_time_label, title, child_name, entry_type, status, added_by, notes")
      .eq("family_id", family.id)
      .gte("entry_date", weekStart)
      .lte("entry_date", endStr)
      .order("entry_date", { ascending: true })
      .order("time_label", { ascending: true }),
    loadNannySchedules(family.id),
  ]);

  return {
    familyName: family.family_name,
    weekStart,
    entries: data ?? [],
    schedules,
    workingDays: schedules[0]?.workingDays ?? [],
    access: family.access,
  };
}

export async function addPlannerEntry(
  slug: string,
  input: {
    entryDate: string;
    timeLabel?: string;
    endTimeLabel?: string;
    title: string;
    childName?: string;
    entryType?: string;
    status?: string;
    notes?: string;
  },
) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  if (input.entryType === "playdate" && family.access !== "family") throw new Error("Only parents can add playdates.");
  const title = clean(input.title, 160);
  if (!title) throw new Error("Please add what's happening");
  const { count } = await supabaseAdmin
    .from("planner_entries")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family.id)
    .eq("entry_date", input.entryDate);
  if ((count ?? 0) >= 12) throw new Error("That day is full");
  const { error } = await supabaseAdmin.from("planner_entries").insert({
    family_id: family.id,
    entry_date: input.entryDate,
    time_label: clean(input.timeLabel, 20),
    end_time_label: clean(input.endTimeLabel, 20),
    title,
    child_name: clean(input.childName, 80),
    entry_type: clean(input.entryType, 30) ?? "note",
    status: clean(input.status, 20) ?? "active",
    added_by: family.access,
    notes: clean(input.notes, 1000),
  });
  if (error) throw new Error(error.message);
}

export async function deletePlannerEntry(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const { error } = await supabaseAdmin
    .from("planner_entries")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

export async function copyPreviousWeek(slug: string, weekStart: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const start = new Date(`${weekStart}T00:00:00Z`);
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setUTCDate(prevEnd.getUTCDate() + 6);

  const { data } = await supabaseAdmin
    .from("planner_entries")
    .select("entry_date, time_label, end_time_label, title, child_name, entry_type, status, added_by, notes")
    .eq("family_id", family.id)
    .gte("entry_date", prevStart.toISOString().slice(0, 10))
    .lte("entry_date", prevEnd.toISOString().slice(0, 10));

  const rows = (data ?? []).slice(0, 60).map((entry) => {
    const date = new Date(`${entry.entry_date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 7);
    return {
      family_id: family.id,
      entry_date: date.toISOString().slice(0, 10),
      time_label: entry.time_label,
      end_time_label: entry.end_time_label,
      title: entry.title,
      child_name: entry.child_name,
      entry_type: entry.entry_type,
      status: entry.status,
      added_by: family.access,
      notes: entry.notes,
    };
  });
  if (rows.length === 0) return { copied: 0 };
  const { error } = await supabaseAdmin.from("planner_entries").insert(rows);
  if (error) throw new Error(error.message);
  return { copied: rows.length };
}

/* ---------------- Daily log ---------------- */

export async function loadLogs(slug: string, limit = 30) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("daily_logs")
    .select("*")
    .eq("family_id", family.id)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return { familyName: family.family_name, logs: data ?? [] };
}

export async function addLog(
  slug: string,
  input: {
    logDate: string;
    activities?: string;
    food?: string;
    homework?: string;
    mood?: string;
    notes?: string;
    tomorrow?: string;
  },
) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const { error } = await supabaseAdmin.from("daily_logs").insert({
    family_id: family.id,
    log_date: input.logDate,
    activities: clean(input.activities),
    food: clean(input.food),
    homework: clean(input.homework),
    mood: clean(input.mood, 40),
    notes: clean(input.notes),
    tomorrow: clean(input.tomorrow),
  });
  if (error) throw new Error(error.message);
}

export async function deleteLog(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const { error } = await supabaseAdmin
    .from("daily_logs")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);
  if (error) throw new Error(error.message);
}

/* ---------------- Support ---------------- */

export async function loadSupport(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data: threads } = await supabaseAdmin
    .from("support_threads")
    .select("id, subject, status, last_sender, family_unread, nanny_unread, created_at, updated_at")
    .eq("family_id", family.id)
    .order("updated_at", { ascending: false });

  const ids = (threads ?? []).map((t) => t.id);
  const { data: messages } = ids.length
    ? await supabaseAdmin
        .from("support_messages")
        .select("id, thread_id, sender, body, created_at")
        .in("thread_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] as { id: string; thread_id: string; sender: string; body: string; created_at: string }[] };

  return {
    familyName: family.family_name,
    access: family.access,
    threads: (threads ?? []).map((thread) => ({
      ...thread,
      messages: (messages ?? []).filter((m) => m.thread_id === thread.id),
    })),
  };
}

export async function askSupport(slug: string, subject: string, body: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const question = clean(body);
  if (!question) throw new Error("Please write your question");

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("support_threads")
    .select("id", { count: "exact", head: true })
    .eq("family_id", family.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 10) throw new Error("Please wait a little before sending more questions");

  const { data: thread, error } = await supabaseAdmin
    .from("support_threads")
    .insert({
      family_id: family.id,
      subject: clean(subject, 140) ?? question.slice(0, 60),
      last_sender: family.access,
      family_unread: false,
      nanny_unread: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: msgError } = await supabaseAdmin
    .from("support_messages")
    .insert({ thread_id: thread.id, sender: family.access, body: question });
  if (msgError) throw new Error(msgError.message);
  return { id: thread.id };
}

export async function replyAsFamily(slug: string, threadId: string, body: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  const message = clean(body);
  if (!message) throw new Error("Please write a message");
  const { data: thread } = await supabaseAdmin
    .from("support_threads")
    .select("id")
    .eq("id", threadId)
    .eq("family_id", family.id)
    .maybeSingle();
  if (!thread) throw new Error("Not found");
  await supabaseAdmin.from("support_messages").insert({
    thread_id: threadId,
    sender: family.access,
    body: message,
  });
  await supabaseAdmin
    .from("support_threads")
    .update({
      last_sender: family.access,
      family_unread: family.access === "family" ? false : true,
      nanny_unread: family.access === "nanny" ? false : true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);
}

export async function markThreadRead(slug: string, threadId: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Locked");
  await supabaseAdmin
    .from("support_threads")
    .update(family.access === "nanny" ? { nanny_unread: false } : { family_unread: false })
    .eq("id", threadId)
    .eq("family_id", family.id);
}

/* ---------------- Wallet home extras ---------------- */

export async function loadHubSummary(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const today = new Date();
  const day = (today.getUTCDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setUTCDate(weekStart.getUTCDate() - day);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const [
    { data: entries },
    { data: logs },
    { data: children },
    { count: unread },
    schedules,
    { count: contactCount },
    { data: profile },
    { data: passportEntries },
    { data: handovers },
    { data: expenses },
    { count: shiftsPending },
    { data: leavePending },
    { count: unreadThreads },
    { data: recentDoses },
    session,
  ] = await Promise.all([
      supabaseAdmin
        .from("planner_entries")
        .select("id, entry_date, time_label, end_time_label, title, child_name, entry_type, status, added_by, notes")
        .eq("family_id", family.id)
        .gte("entry_date", weekStartStr)
        .lte("entry_date", weekEnd.toISOString().slice(0, 10))
        .order("entry_date", { ascending: true })
        .order("time_label", { ascending: true }),
      supabaseAdmin
        .from("daily_logs")
        .select("id, log_date, activities, mood, notes")
        .eq("family_id", family.id)
        .order("log_date", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("family_children")
        .select("id, name, date_of_birth, school, allergies, medication")
        .eq("family_id", family.id),
      supabaseAdmin
        .from("support_threads")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq(family.access === "nanny" ? "nanny_unread" : "family_unread", true),
      loadNannySchedules(family.id),
      supabaseAdmin
        .from("family_contacts")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id),
      supabaseAdmin
        .from("family_profile")
        .select("home_address, gp_details, emergency_instructions, house_rules")
        .eq("family_id", family.id)
        .maybeSingle(),
      supabaseAdmin
        .from("sports_passport_entries")
        .select("id, entry_date, child_name, activity, badge")
        .eq("family_id", family.id)
        .order("entry_date", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("handover_checklists")
        .select("id, handover_date")
        .eq("family_id", family.id)
        .order("handover_date", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("expense_claims")
        .select("id, amount, nanny_id")
        .eq("family_id", family.id)
        .eq("status", "pending"),
      supabaseAdmin
        .from("timesheet_shifts")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("status", "pending"),
      supabaseAdmin
        .from("leave_requests")
        .select("id, nanny_id")
        .eq("family_id", family.id)
        .eq("status", "pending"),
      supabaseAdmin
        .from("household_threads")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq(family.access === "nanny" ? "nanny_unread" : "family_unread", true),
      supabaseAdmin
        .from("medication_doses")
        .select("id, child_name, medicine, dose, given_at, given_by_name, next_dose_from")
        .eq("family_id", family.id)
        .gte("given_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("given_at", { ascending: false })
        .limit(6),
      sessionAccess(slug),
    ]);

  // A nanny sees only their own leave and expenses; timesheets have no nanny column yet.
  const nannyId = family.access === "nanny" ? (session?.nannyId ?? null) : null;
  const mine = <T extends { nanny_id: string | null }>(rows: T[] | null) =>
    (rows ?? []).filter((row) => !nannyId || row.nanny_id === nannyId);
  const pendingExpenses = mine(expenses);
  const todayLondon = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    today,
  );

  const workingDays: WorkingDay[] = schedules[0]?.workingDays ?? [];

  const kids = children ?? [];

  return {
    weekStart: weekStartStr,
    entries: entries ?? [],
    latestLog: logs?.[0] ?? null,
    childCount: kids.length,
    unreadReplies: unread ?? 0,
    latestPassport: passportEntries?.[0] ?? null,
    latestHandover: handovers?.[0] ?? null,
    pendingExpensesTotal: Number(
      pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0).toFixed(2),
    ),
    attention: {
      shiftsPending: shiftsPending ?? 0,
      leavePending: mine(leavePending).length,
      expensesPending: pendingExpenses.length,
      unreadThreads: unreadThreads ?? 0,
    },
    today: {
      date: todayLondon,
      logged: logs?.[0]?.log_date === todayLondon,
      handedOver: handovers?.[0]?.handover_date === todayLondon,
    },
    recentDoses: recentDoses ?? [],
    children: kids.map((c) => ({
      id: c.id,
      name: c.name,
      allergies: c.allergies,
      medication: c.medication,
    })),
    nannyId,
    workingDays,
    schedules,
    access: family.access,
    readiness: {
      children: kids.length > 0,
      childDetails: kids.length > 0 && kids.every((c) => Boolean(c.school || c.date_of_birth)),
      allergies: kids.length > 0 && kids.every((c) => Boolean(c.allergies || c.medication)),
      contacts: (contactCount ?? 0) > 0,
      homeAddress: Boolean(profile?.home_address),
      gp: Boolean(profile?.gp_details),
      houseRules: Boolean(profile?.house_rules),
      nannies: schedules.length > 0,
    },
  };
}

export async function loadEmergencyCard(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const [{ data: profile }, { data: children }, { data: contacts }, nannyRows] = await Promise.all([
    supabaseAdmin
      .from("family_profile")
      .select("home_address, gp_details, medical_notes, emergency_instructions")
      .eq("family_id", family.id)
      .maybeSingle(),
    supabaseAdmin
      .from("family_children")
      .select("name, allergies, medication, school")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("family_contacts")
      .select("id, name, relationship, phone")
      .eq("family_id", family.id)
      .order("sort_order", { ascending: true }),
    listNannyRows(family.id),
  ]);

  return {
    familyName: family.family_name,
    access: family.access,
    profile: profile ?? null,
    children: children ?? [],
    contacts: contacts ?? [],
    nannies: nannyRows.map((row) => ({
      id: row.id,
      name: row.name,
      emergency: row.emergency_name
        ? {
            name: row.emergency_name,
            relationship: row.emergency_relationship,
            phone: row.emergency_phone ?? "",
          }
        : null,
    })),
  };
}

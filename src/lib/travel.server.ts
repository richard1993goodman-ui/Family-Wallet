import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { listNannyRows, sessionAccess } from "./wallet.server";
import { DEFAULT_TRAVEL_CHECKLIST, type ChecklistItem, type TravelNote, type TripInput } from "./travel.types";

const clean = (v: string | undefined | null, max = 1000) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const rid = () => crypto.randomUUID();

async function author(slug: string, familyId: string, familyName: string) {
  const s = await sessionAccess(slug);
  if (s?.level === "nanny") {
    const n = (await listNannyRows(familyId)).find((r) => r.id === s.nannyId);
    return { role: "nanny" as const, name: n?.name ?? "Nanny" };
  }
  return { role: "family" as const, name: familyName };
}

function mapTrip(t: {
  id: string; destination: string; start_date: string; end_date: string; accommodation: string | null;
  local_emergency: string | null; nearest_hospital: string | null; time_difference: string | null;
  travel_pay: string | null; notes: string | null; checklist: unknown; handover_notes: unknown;
}) {
  return {
    id: t.id,
    destination: t.destination,
    startDate: t.start_date,
    endDate: t.end_date,
    accommodation: t.accommodation,
    localEmergency: t.local_emergency,
    nearestHospital: t.nearest_hospital,
    timeDifference: t.time_difference,
    travelPay: t.travel_pay,
    notes: t.notes,
    checklist: (Array.isArray(t.checklist) ? t.checklist : []) as ChecklistItem[],
    handoverNotes: (Array.isArray(t.handover_notes) ? t.handover_notes : []) as TravelNote[],
  };
}

export async function loadTravel(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("travel_trips")
    .select("*")
    .eq("family_id", family.id)
    .order("start_date", { ascending: false })
    .limit(20);
  const today = new Date().toISOString().slice(0, 10);
  const trips = (data ?? []).map(mapTrip);
  const active = trips.find((t) => t.startDate <= today && t.endDate >= today) ?? null;
  const upcoming = [...trips].reverse().find((t) => t.startDate > today) ?? null;
  return { access: family.access, familyName: family.family_name, today, trips, active, upcoming };
}

export async function saveTrip(slug: string, input: TripInput) {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only parents can set up a trip.");
  const destination = clean(input.destination, 120);
  if (!destination || !isDate(input.startDate) || !isDate(input.endDate) || input.endDate < input.startDate)
    throw new Error("Please add a destination and valid dates.");
  const row = {
    destination,
    start_date: input.startDate,
    end_date: input.endDate,
    accommodation: clean(input.accommodation),
    local_emergency: clean(input.localEmergency, 200),
    nearest_hospital: clean(input.nearestHospital),
    time_difference: clean(input.timeDifference, 60),
    travel_pay: clean(input.travelPay, 400),
    notes: clean(input.notes, 2000),
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { error } = await supabaseAdmin.from("travel_trips").update(row).eq("id", input.id).eq("family_id", family.id);
    if (error) throw error;
    return { id: input.id };
  }
  const checklist = DEFAULT_TRAVEL_CHECKLIST.map((label) => ({ id: rid(), label, done: false }));
  const { data, error } = await supabaseAdmin
    .from("travel_trips")
    .insert({ ...row, family_id: family.id, checklist })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

async function getTrip(slug: string, tripId: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Wallet locked.");
  const { data } = await supabaseAdmin.from("travel_trips").select("*").eq("id", tripId).eq("family_id", family.id).maybeSingle();
  if (!data) throw new Error("Trip not found.");
  return { family, trip: mapTrip(data) };
}

export async function updateChecklist(
  slug: string,
  tripId: string,
  action: { type: "toggle"; itemId: string } | { type: "add"; label: string } | { type: "remove"; itemId: string },
) {
  const { trip } = await getTrip(slug, tripId);
  let list = trip.checklist;
  if (action.type === "toggle") list = list.map((i) => (i.id === action.itemId ? { ...i, done: !i.done } : i));
  if (action.type === "remove") list = list.filter((i) => i.id !== action.itemId);
  if (action.type === "add") {
    const label = clean(action.label, 160);
    if (label) list = [...list, { id: rid(), label, done: false }].slice(0, 80);
  }
  await supabaseAdmin.from("travel_trips").update({ checklist: list, updated_at: new Date().toISOString() }).eq("id", tripId);
  return { ok: true as const };
}

export async function addTravelNote(slug: string, tripId: string, input: { category: string; text: string }) {
  const { family, trip } = await getTrip(slug, tripId);
  const text = clean(input.text, 1200);
  if (!text) throw new Error("Please write a note.");
  const who = await author(slug, family.id, family.family_name);
  const note: TravelNote = {
    id: rid(),
    category: clean(input.category, 40) ?? "general",
    text,
    authorRole: who.role,
    authorName: who.name,
    createdAt: new Date().toISOString(),
  };
  const notes = [note, ...trip.handoverNotes].slice(0, 200);
  await supabaseAdmin.from("travel_trips").update({ handover_notes: notes, updated_at: new Date().toISOString() }).eq("id", tripId);
  return note;
}

export async function deleteTrip(slug: string, tripId: string) {
  const { family } = await getTrip(slug, tripId);
  if (family.access !== "family") throw new Error("Only parents can delete a trip.");
  await supabaseAdmin.from("travel_trips").delete().eq("id", tripId).eq("family_id", family.id);
  return { ok: true as const };
}

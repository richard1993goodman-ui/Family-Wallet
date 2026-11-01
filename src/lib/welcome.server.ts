import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { WELCOME_STEPS, FIRST_48_STEPS, canConfirmFirst48, first48Done, validateFirst48Input, type First48Input, type WelcomeStepId } from "./welcome.types";
import { listNannyRows, sessionAccess } from "./wallet.server";

export type WelcomeStep = {
  id: WelcomeStepId;
  label: string;
  description: string;
  href: string;
  done: boolean;
  manual: boolean;
};

export type WelcomeProgress = {
  access: "family" | "nanny";
  familyName: string;
  steps: WelcomeStep[];
  doneCount: number;
  total: number;
  completed: boolean;
  finishedAt: string | null;
};

type ProgressRow = {
  steps: Record<string, boolean>;
  finished_at: string | null;
};

async function loadProgressRow(familyId: string): Promise<ProgressRow | null> {
  const { data } = await supabaseAdmin
    .from("welcome_progress")
    .select("steps, finished_at")
    .eq("family_id", familyId)
    .maybeSingle();
  if (!data) return null;
  return {
    steps: (data.steps ?? {}) as Record<string, boolean>,
    finished_at: data.finished_at ?? null,
  };
}

export async function loadWelcome(slug: string): Promise<WelcomeProgress | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;

  const [
    { data: agreements },
    { data: nannies },
    { count: contactCount },
    { count: childCount },
    { count: plannerCount },
    { count: logCount },
    { data: profile },
    progress,
  ] = await Promise.all([
    supabaseAdmin.from("nanny_agreements").select("id").eq("family_id", family.id),
    supabaseAdmin.from("family_nannies").select("nanny_code_hash").eq("family_id", family.id),
    supabaseAdmin
      .from("family_contacts")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.id),
    supabaseAdmin
      .from("family_children")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.id),
    supabaseAdmin
      .from("planner_entries")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.id),
    supabaseAdmin
      .from("daily_logs")
      .select("id", { count: "exact", head: true })
      .eq("family_id", family.id),
    supabaseAdmin
      .from("family_profile")
      .select("id")
      .eq("family_id", family.id)
      .maybeSingle(),
    loadProgressRow(family.id),
  ]);

  const auto: Record<WelcomeStepId, boolean> = {
    agreement: (agreements?.length ?? 0) > 0,
    emergency: Boolean(profile),
    contacts: (contactCount ?? 0) > 0,
    children: (childCount ?? 0) > 0,
    planner: (plannerCount ?? 0) > 0,
    nanny: (nannies ?? []).some((n) => Boolean(n.nanny_code_hash)),
    dailyLog: (logCount ?? 0) > 0,
  };
  const manual = progress?.steps ?? {};

  const steps: WelcomeStep[] = WELCOME_STEPS.map((step) => ({
    ...step,
    done: auto[step.id] || manual[step.id] === true,
    manual: manual[step.id] === true && !auto[step.id],
  }));
  const doneCount = steps.filter((s) => s.done).length;

  return {
    access: family.access,
    familyName: family.family_name,
    steps,
    doneCount,
    total: steps.length,
    completed: doneCount === steps.length,
    finishedAt: progress?.finished_at ?? null,
  };
}

export async function setWelcomeStep(slug: string, stepId: WelcomeStepId, done: boolean) {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can update setup.");
  if (!WELCOME_STEPS.some((s) => s.id === stepId)) throw new Error("Unknown step.");

  const existing = await loadProgressRow(family.id);
  const steps = { ...(existing?.steps ?? {}), [stepId]: done };
  await supabaseAdmin
    .from("welcome_progress")
    .upsert(
      { family_id: family.id, steps, updated_at: new Date().toISOString() },
      { onConflict: "family_id" },
    );
}

export async function finishWelcome(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family || family.access !== "family") throw new Error("Only a parent can finish setup.");
  const existing = await loadProgressRow(family.id);
  await supabaseAdmin.from("welcome_progress").upsert(
    {
      family_id: family.id,
      steps: existing?.steps ?? {},
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "family_id" },
  );
}

export async function loadFirst48(slug: string) {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const session = await sessionAccess(slug);
  if (!session) return null;
  const nannies = (await listNannyRows(family.id)).filter((nanny) =>
    canConfirmFirst48(session.level, session.nannyId, nanny.id),
  );
  const { data: rows, error } = await supabaseAdmin.from("welcome_checkins")
    .select("nanny_id, step_id, confirmed_by, confirmed_at, note")
    .eq("family_id", family.id);
  if (error) throw new Error("The checklist could not be loaded. Please try again.");
  return {
    access: session.level,
    nannies: nannies.map((nanny) => {
      const steps = FIRST_48_STEPS.map((step) => {
        const parent = rows?.find((row) => row.nanny_id === nanny.id && row.step_id === step.id && row.confirmed_by === "family");
        const carer = rows?.find((row) => row.nanny_id === nanny.id && row.step_id === step.id && row.confirmed_by === "nanny");
        return { ...step, parentConfirmed: parent?.confirmed_at ?? null, nannyConfirmed: carer?.confirmed_at ?? null, parentNote: parent?.note ?? "", nannyNote: carer?.note ?? "", done: first48Done(parent?.confirmed_at ?? null, carer?.confirmed_at ?? null) };
      });
      return { id: nanny.id, name: nanny.name, steps, doneCount: steps.filter((step) => step.done).length, total: steps.length };
    }),
  };
}

export async function saveFirst48(input: First48Input) {
  const data = validateFirst48Input(input);
  const family = await requireSharedFamily(data.slug);
  const session = await sessionAccess(data.slug);
  if (!family || !session || !canConfirmFirst48(session.level, session.nannyId, data.nannyId)) throw new Error("Please sign in to your own checklist.");
  const nannies = await listNannyRows(family.id);
  if (!nannies.some((nanny) => nanny.id === data.nannyId)) throw new Error("This nanny is not active in your family.");
  const { error } = await supabaseAdmin.from("welcome_checkins").upsert({
    family_id: family.id,
    nanny_id: data.nannyId,
    step_id: data.stepId,
    confirmed_by: session.level,
    confirmed_at: data.confirmed ? new Date().toISOString() : null,
    note: data.note,
    updated_at: new Date().toISOString(),
  }, { onConflict: "family_id,nanny_id,step_id,confirmed_by" });
  if (error) throw new Error("Your update could not be saved. Please try again.");
}

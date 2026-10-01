import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { WELCOME_STEPS, type WelcomeStepId } from "./welcome.types";

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

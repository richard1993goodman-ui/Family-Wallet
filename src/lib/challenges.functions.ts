import { assertTwoStep } from "./staff.scope";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
};

async function assertAdmin(context: Ctx) {
  assertTwoStep(context);
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

const clean = (v: string | undefined | null, max: number) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

export const listChallengesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: challenges } = await supabaseAdmin
      .from("agency_challenges")
      .select("id, title, description, due_date, audience, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = (challenges ?? []).map((c) => c.id);
    const [{ data: recips }, { data: comps }] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("challenge_recipients").select("challenge_id, family_id").in("challenge_id", ids)
        : Promise.resolve({ data: [] as { challenge_id: string; family_id: string }[] }),
      ids.length
        ? supabaseAdmin.from("challenge_completions").select("challenge_id, family_id").in("challenge_id", ids)
        : Promise.resolve({ data: [] as { challenge_id: string; family_id: string }[] }),
    ]);
    return (challenges ?? []).map((c) => ({
      ...c,
      recipientIds: (recips ?? []).filter((r) => r.challenge_id === c.id).map((r) => r.family_id),
      completedIds: (comps ?? []).filter((r) => r.challenge_id === c.id).map((r) => r.family_id),
    }));
  });

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { title: string; description?: string; dueDate?: string; audience: "all" | "selected"; familyIds: string[] }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const title = clean(data.title, 160);
    if (!title) throw new Error("Add a challenge title");
    if (data.audience === "selected" && data.familyIds.length === 0) throw new Error("Pick at least one family");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("agency_challenges")
      .insert({
        title,
        description: clean(data.description, 2000),
        due_date: data.dueDate || null,
        audience: data.audience === "selected" ? "selected" : "all",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.audience === "selected") {
      const { error: e2 } = await supabaseAdmin
        .from("challenge_recipients")
        .insert(data.familyIds.slice(0, 500).map((family_id) => ({ challenge_id: row.id, family_id })));
      if (e2) throw new Error(e2.message);
    }
    return { id: row.id };
  });

export const setChallengeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("agency_challenges").update({ is_active: data.active }).eq("id", data.id);
    return { ok: true as const };
  });

export const deleteChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("agency_challenges").delete().eq("id", data.id);
    return { ok: true as const };
  });

/* ---------- Wallet side (link + code session) ---------- */

export const getWalletChallenges = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { loadWalletChallenges } = await import("./challenges.server");
    return loadWalletChallenges(data.slug);
  });

export const completeChallenge = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; challengeId: string; note?: string }) => d)
  .handler(async ({ data }) => {
    const { markChallengeDone } = await import("./challenges.server");
    await markChallengeDone(data.slug, data.challengeId, data.note);
    return { ok: true as const };
  });

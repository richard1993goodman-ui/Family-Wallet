import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";

export type WalletChallenge = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  note: string | null;
};

async function visibleChallenges(familyId: string) {
  const { data: all } = await supabaseAdmin
    .from("agency_challenges")
    .select("id, title, description, due_date, audience, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);
  const list = all ?? [];
  const selectedIds = list.filter((c) => c.audience === "selected").map((c) => c.id);
  let mine = new Set<string>();
  if (selectedIds.length) {
    const { data } = await supabaseAdmin
      .from("challenge_recipients")
      .select("challenge_id")
      .eq("family_id", familyId)
      .in("challenge_id", selectedIds);
    mine = new Set((data ?? []).map((r) => r.challenge_id));
  }
  return list.filter((c) => c.audience === "all" || mine.has(c.id));
}

export async function loadWalletChallenges(slug: string): Promise<WalletChallenge[] | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const list = await visibleChallenges(family.id);
  if (!list.length) return [];
  const { data: comps } = await supabaseAdmin
    .from("challenge_completions")
    .select("challenge_id, completed_at, completed_by, note")
    .eq("family_id", family.id)
    .in("challenge_id", list.map((c) => c.id));
  return list.map((c) => {
    const done = (comps ?? []).find((x) => x.challenge_id === c.id);
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      dueDate: c.due_date,
      completedAt: done?.completed_at ?? null,
      completedBy: done?.completed_by ?? null,
      note: done?.note ?? null,
    };
  });
}

export async function markChallengeDone(slug: string, challengeId: string, note?: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Vault is locked");
  const list = await visibleChallenges(family.id);
  if (!list.some((c) => c.id === challengeId)) throw new Error("Challenge not found");
  const { error } = await supabaseAdmin.from("challenge_completions").upsert(
    {
      challenge_id: challengeId,
      family_id: family.id,
      note: (note ?? "").trim().slice(0, 1000) || null,
      completed_by: family.access === "nanny" ? "nanny" : "family",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "challenge_id,family_id" },
  );
  if (error) throw new Error(error.message);
}

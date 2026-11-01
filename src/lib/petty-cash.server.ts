import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { pettyCashBalance, type PettyCashData, type PettyCashInput, type PettyCashRow } from "./petty-cash.types";

export async function loadPettyCash(slug: string): Promise<PettyCashData | null> {
  const family = await requireSharedFamily(slug);
  if (!family) return null;
  const { data } = await supabaseAdmin
    .from("petty_cash_entries")
    .select("id, kind, entry_date, amount, description, added_by, added_by_name")
    .eq("family_id", family.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  const entries: PettyCashRow[] = (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind as PettyCashRow["kind"],
    entryDate: r.entry_date,
    amount: Number(r.amount),
    description: r.description,
    addedBy: r.added_by,
    addedByName: r.added_by_name,
  }));
  return { access: family.access, balance: pettyCashBalance(entries), entries };
}

export async function addPettyCash(slug: string, input: PettyCashInput) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  // Only the family adds money to the float; the nanny logs spending.
  const kind = family.access === "family" ? input.kind : "spend";
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0) || amount > 10000) throw new Error("Enter an amount above zero.");
  const description = (input.description ?? "").trim().slice(0, 200);
  if (!description) throw new Error("Add a short description.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) throw new Error("Choose a date.");
  const { error } = await supabaseAdmin.from("petty_cash_entries").insert({
    family_id: family.id,
    kind,
    entry_date: input.entryDate,
    amount,
    description,
    added_by: family.access,
    added_by_name: family.access === "family" ? "Parent" : family.nanny_name ?? "Nanny",
  });
  if (error) throw new Error("Couldn't save that entry.");
}

export async function deletePettyCash(slug: string, id: string) {
  const family = await requireSharedFamily(slug);
  if (!family) throw new Error("Please sign in again.");
  let q = supabaseAdmin.from("petty_cash_entries").delete().eq("id", id).eq("family_id", family.id);
  if (family.access === "nanny") q = q.eq("added_by", "nanny");
  const { error } = await q;
  if (error) throw new Error("Couldn't remove that entry.");
}

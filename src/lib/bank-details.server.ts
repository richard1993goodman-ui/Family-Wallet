import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSharedFamily } from "./family.server";
import { listNannyRows, sessionAccess } from "./wallet.server";
import { bankDetailsSchema, canEditBankDetails, canViewBankDetails, maskAccount, type BankDetailsInput, type BankSummary } from "./bank-details.types";

async function ctx(slug: string) {
  setResponseHeader("Cache-Control", "no-store");
  const family = await requireSharedFamily(slug);
  const session = family ? await sessionAccess(slug) : null;
  if (!family || !session) return null;
  return { family, session };
}

export async function loadBankSummaries(slug: string): Promise<{ access: "family" | "nanny"; items: BankSummary[] } | null> {
  const c = await ctx(slug);
  if (!c) return null;
  const nannies = (await listNannyRows(c.family.id)).filter(n => canViewBankDetails(c.session.level, c.session.nannyId, n.id));
  const { data, error } = await supabaseAdmin.from("nanny_bank_details")
    .select("nanny_id, account_name, account_number, iban, updated_at").eq("family_id", c.family.id);
  if (error) throw new Error("Couldn't load payment details.");
  return {
    access: c.session.level,
    items: nannies.map(n => {
      const row = data?.find(r => r.nanny_id === n.id);
      return { nannyId: n.id, nannyName: n.name, hasDetails: !!row, accountName: row?.account_name ?? null,
        masked: row ? maskAccount(row.account_number, row.iban) : null, updatedAt: row?.updated_at ?? null,
        isMine: c.session.nannyId === n.id };
    }),
  };
}

export async function revealBankDetails(slug: string, nannyId: string) {
  const c = await ctx(slug);
  if (!c || !canViewBankDetails(c.session.level, c.session.nannyId, nannyId)) throw new Error("Please unlock your wallet.");
  const { data, error } = await supabaseAdmin.from("nanny_bank_details")
    .select("account_name, bank_name, sort_code, account_number, iban, swift, payment_reference")
    .eq("family_id", c.family.id).eq("nanny_id", nannyId).maybeSingle();
  if (error || !data) throw new Error("No payment details saved.");
  return { accountName: data.account_name, bankName: data.bank_name ?? "", sortCode: data.sort_code ?? "", accountNumber: data.account_number ?? "",
    iban: data.iban ?? "", swift: data.swift ?? "", paymentReference: data.payment_reference ?? "" };
}

export async function saveBankDetails(slug: string, input: BankDetailsInput) {
  const c = await ctx(slug);
  const nannyId = c?.session.nannyId;
  if (!c || !nannyId || !canEditBankDetails(c.session.level, nannyId, nannyId)) throw new Error("Only the nanny can add their own bank details.");
  const d = bankDetailsSchema.parse(input);
  const { error } = await supabaseAdmin.from("nanny_bank_details").upsert({
    family_id: c.family.id, nanny_id: nannyId, account_name: d.accountName, bank_name: d.bankName || null, sort_code: d.sortCode || null,
    account_number: d.accountNumber || null, iban: d.iban || null, swift: d.swift || null, payment_reference: d.paymentReference || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "family_id,nanny_id" });
  if (error) throw new Error("Couldn't save your bank details.");
  return { ok: true as const };
}

export async function deleteBankDetails(slug: string) {
  const c = await ctx(slug);
  const nannyId = c?.session.nannyId;
  if (!c || c.session.level !== "nanny" || !nannyId) throw new Error("Only the nanny can remove their own bank details.");
  const { error } = await supabaseAdmin.from("nanny_bank_details").delete().eq("family_id", c.family.id).eq("nanny_id", nannyId);
  if (error) throw new Error("Couldn't remove your bank details.");
  return { ok: true as const };
}

import { z } from "zod";

export const bankSlugSchema = z.object({ slug: z.string().trim().min(1).max(200) });
export const bankRevealSchema = bankSlugSchema.extend({ nannyId: z.string().uuid() });
const opt = (max: number) => z.string().trim().max(max).optional().default("");
export const bankDetailsSchema = z.object({
  accountName: z.string().trim().min(1, "Add the name on the account.").max(120),
  bankName: opt(120),
  sortCode: opt(20),
  accountNumber: opt(34),
  iban: opt(40),
  swift: opt(20),
  paymentReference: opt(120),
}).refine(d => d.accountNumber || d.iban, { message: "Add an account number or IBAN." });
export type BankDetailsInput = z.input<typeof bankDetailsSchema>;
export type BankDetailsFull = z.output<typeof bankDetailsSchema>;
export type BankSummary = { nannyId: string; nannyName: string; hasDetails: boolean; accountName: string | null; masked: string | null; updatedAt: string | null; isMine: boolean };

/** Only a nanny can write bank details, and only their own. */
export function canEditBankDetails(level: "family" | "nanny", sessionNannyId: string | null, targetNannyId: string) {
  return level === "nanny" && sessionNannyId === targetNannyId;
}
/** Parents see every nanny in the family; a nanny sees only their own. */
export function canViewBankDetails(level: "family" | "nanny", sessionNannyId: string | null, targetNannyId: string) {
  return level === "family" || sessionNannyId === targetNannyId;
}
export function maskAccount(accountNumber: string | null, iban: string | null) {
  const v = (accountNumber || iban || "").replace(/\s/g, "");
  return v ? `•••• ${v.slice(-4)}` : null;
}

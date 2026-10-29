import { z } from "zod";

export const MANUAL_CATEGORIES = [
  { id: "access", label: "Access, codes & keys", examples: "WiFi, alarm, lockbox, gate and school pick-up passwords" },
  { id: "emergencies", label: "Emergencies & utilities", examples: "Stopcock, fuse board, spare keys and emergency equipment" },
  { id: "rules", label: "House rules & kitchen", examples: "Food, visitors, screen time and photo permissions" },
  { id: "appliances", label: "Bin days & appliances", examples: "Recycling days, washing machine and heating instructions" },
] as const;
export const manualSlugSchema = z.object({ slug: z.string().trim().min(1).max(200) });
export const manualEntrySchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(["access", "emergencies", "rules", "appliances"]),
  title: z.string().trim().min(1, "Add a title.").max(100),
  notes: z.string().trim().max(4000),
  secretValue: z.string().max(500).optional(),
});
export const manualIdSchema = manualSlugSchema.extend({ id: z.string().uuid() });
export type ManualInput = z.infer<typeof manualEntrySchema>;
export type ManualRow = { id: string; category: ManualInput["category"]; title: string; notes: string; hasSecret: boolean; updatedAt: string };
export type ManualData = { access: "family" | "nanny"; entries: ManualRow[] };
export function canManageManual(access: string | null) { return access === "family"; }
export function manualSummary(row: { id: string; category: string; title: string; notes: string; has_secret: boolean; updated_at: string }): ManualRow {
  return { id: row.id, category: row.category as ManualRow["category"], title: row.title, notes: row.notes, hasSecret: row.has_secret, updatedAt: row.updated_at };
}
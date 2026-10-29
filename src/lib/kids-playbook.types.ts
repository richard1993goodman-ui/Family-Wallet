import { z } from "zod";

export const PLAYBOOK_CATEGORIES = [
  { id: "comfort", label: "Quirks & comfort", examples: "What soothes them, fears and sensitivities, current obsessions" },
  { id: "handle", label: "How we handle…", examples: "Tantrums, rewards, screen and gaming rules — so everyone says the same thing" },
  { id: "friends", label: "Friends & pick-ups", examples: "Best friends, club pick-up arrangements — add playdates with address and emergency contact in the Calendar" },
  { id: "activities", label: "Rainy-day ideas", examples: "Home activities, favourite recipes and local spots the kids love" },
] as const;
export type PlaybookCategory = (typeof PLAYBOOK_CATEGORIES)[number]["id"];
export const playbookSlugSchema = z.object({ slug: z.string().trim().min(1).max(200) });
export const playbookEntrySchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(["comfort", "handle", "friends", "activities"]),
  childName: z.string().trim().max(60),
  title: z.string().trim().min(1, "Add a title.").max(100),
  notes: z.string().trim().max(4000),
});
export const playbookIdSchema = playbookSlugSchema.extend({ id: z.string().uuid() });
export type PlaybookInput = z.infer<typeof playbookEntrySchema>;
export type PlaybookRow = PlaybookInput & { id: string; addedBy: "family" | "nanny"; updatedAt: string };
export type PlaybookData = { access: "family" | "nanny"; entries: PlaybookRow[] };

/** Parents manage everything; nannies may only add and edit rainy-day ideas (never pick-up permissions or rules). */
export function canEditPlaybook(access: string | null, category: string) {
  if (access === "family") return true;
  return access === "nanny" && category === "activities";
}

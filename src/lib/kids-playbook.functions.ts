import { createServerFn } from "@tanstack/react-start";
import { playbookEntrySchema, playbookIdSchema, playbookSlugSchema } from "./kids-playbook.types";

export const getKidsPlaybook = createServerFn({ method: "GET" }).inputValidator(playbookSlugSchema).handler(async ({ data }) => {
  const { loadKidsPlaybook } = await import("./kids-playbook.server");
  return loadKidsPlaybook(data.slug);
});
export const saveKidsPlaybookFn = createServerFn({ method: "POST" })
  .inputValidator(playbookSlugSchema.extend({ entry: playbookEntrySchema })).handler(async ({ data }) => {
    const { saveKidsPlaybook } = await import("./kids-playbook.server");
    return saveKidsPlaybook(data.slug, data.entry);
  });
export const deleteKidsPlaybookFn = createServerFn({ method: "POST" }).inputValidator(playbookIdSchema).handler(async ({ data }) => {
  const { deleteKidsPlaybook } = await import("./kids-playbook.server");
  return deleteKidsPlaybook(data.slug, data.id);
});

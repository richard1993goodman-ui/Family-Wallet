import { createServerFn } from "@tanstack/react-start";
import { manualEntrySchema, manualIdSchema, manualSlugSchema } from "./house-manual.types";

export const getHouseManual = createServerFn({ method: "GET" }).inputValidator(manualSlugSchema).handler(async ({ data }) => {
  const { loadHouseManual } = await import("./house-manual.server");
  return loadHouseManual(data.slug);
});
export const saveHouseManualFn = createServerFn({ method: "POST" })
  .inputValidator(manualSlugSchema.extend({ entry: manualEntrySchema })).handler(async ({ data }) => {
    const { saveHouseManual } = await import("./house-manual.server");
    return saveHouseManual(data.slug, data.entry);
  });
export const revealHouseManualFn = createServerFn({ method: "POST" }).inputValidator(manualIdSchema).handler(async ({ data }) => {
  const { revealHouseManual } = await import("./house-manual.server");
  return revealHouseManual(data.slug, data.id);
});
export const deleteHouseManualFn = createServerFn({ method: "POST" }).inputValidator(manualIdSchema).handler(async ({ data }) => {
  const { deleteHouseManual } = await import("./house-manual.server");
  return deleteHouseManual(data.slug, data.id);
});
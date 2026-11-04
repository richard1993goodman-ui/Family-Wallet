import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { bankRevealSchema, bankSlugSchema } from "./bank-details.types";

export const getBankSummaries = createServerFn({ method: "GET" }).inputValidator(bankSlugSchema).handler(async ({ data }) => {
  const { loadBankSummaries } = await import("./bank-details.server");
  return loadBankSummaries(data.slug);
});
export const revealBankDetailsFn = createServerFn({ method: "POST" }).inputValidator(bankRevealSchema).handler(async ({ data }) => {
  const { revealBankDetails } = await import("./bank-details.server");
  return revealBankDetails(data.slug, data.nannyId);
});
export const saveBankDetailsFn = createServerFn({ method: "POST" })
  .inputValidator(bankSlugSchema.extend({ details: z.record(z.string(), z.string()) })).handler(async ({ data }) => {
    const { saveBankDetails } = await import("./bank-details.server");
    return saveBankDetails(data.slug, data.details);
  });
export const deleteBankDetailsFn = createServerFn({ method: "POST" }).inputValidator(bankSlugSchema).handler(async ({ data }) => {
  const { deleteBankDetails } = await import("./bank-details.server");
  return deleteBankDetails(data.slug);
});

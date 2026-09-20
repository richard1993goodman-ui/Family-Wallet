import { createServerFn } from "@tanstack/react-start";

import type { DoseInput } from "./medication.types";

export const getMedication = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadMedication } = await import("./medication.server");
    return loadMedication(data.slug);
  });

export const recordDoseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; dose: DoseInput }) => data)
  .handler(async ({ data }) => {
    const { recordDose } = await import("./medication.server");
    return recordDose(data.slug, data.dose);
  });

export const deleteDoseFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteDose } = await import("./medication.server");
    await deleteDose(data.slug, data.id);
    return { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";

export const getWorkHours = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkHours } = await import("./work-hours.server");
    return loadWorkHours(data.slug);
  });

export const saveWorkHoursFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; nannyId: string; days: unknown; schedule: unknown }) => data)
  .handler(async ({ data }) => {
    const { saveWorkHours } = await import("./work-hours.server");
    await saveWorkHours(data.slug, data.nannyId, data.days, data.schedule);
    return { ok: true as const };
  });

export const setUseAgreementFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; use: boolean }) => data)
  .handler(async ({ data }) => {
    const { setUseAgreement } = await import("./work-hours.server");
    await setUseAgreement(data.slug, data.use === true);
    return { ok: true as const };
  });

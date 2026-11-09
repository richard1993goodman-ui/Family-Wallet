import { createServerFn } from "@tanstack/react-start";

import type { CareEventInput } from "./care-events.types";

export const getCareEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadCareEvents } = await import("./care-events.server");
    return loadCareEvents(data.slug);
  });

export const addCareEventFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; event: CareEventInput }) => data)
  .handler(async ({ data }) => {
    const { addCareEvent } = await import("./care-events.server");
    await addCareEvent(data.slug, data.event);
    return { ok: true as const };
  });

export const endNapFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { endNap } = await import("./care-events.server");
    await endNap(data.slug, data.id);
    return { ok: true as const };
  });

export const deleteCareEventFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteCareEvent } = await import("./care-events.server");
    await deleteCareEvent(data.slug, data.id);
    return { ok: true as const };
  });

import { createServerFn } from "@tanstack/react-start";

import type { IncidentInput } from "./incidents.types";

export const getIncidents = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadIncidents } = await import("./incidents.server");
    return loadIncidents(data.slug);
  });

export const addIncidentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; incident: IncidentInput }) => data)
  .handler(async ({ data }) => {
    const { addIncident } = await import("./incidents.server");
    return addIncident(data.slug, data.incident);
  });

export const acknowledgeIncidentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { acknowledgeIncident } = await import("./incidents.server");
    await acknowledgeIncident(data.slug, data.id);
    return { ok: true as const };
  });

export const deleteIncidentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteIncident } = await import("./incidents.server");
    await deleteIncident(data.slug, data.id);
    return { ok: true as const };
  });

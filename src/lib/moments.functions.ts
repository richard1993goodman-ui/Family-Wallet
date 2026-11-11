import { createServerFn } from "@tanstack/react-start";

import type { MomentInput, MomentPhotoInput } from "./moments.types";

export const getMoments = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadMoments } = await import("./moments.server");
    return loadMoments(data.slug);
  });

export const addMomentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; moment: MomentInput }) => data)
  .handler(async ({ data }) => {
    const { addMoment } = await import("./moments.server");
    await addMoment(data.slug, data.moment);
    return { ok: true as const };
  });

export const saveMomentPhotoFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; moment: MomentPhotoInput }) => data)
  .handler(async ({ data }) => {
    const { saveMomentPhoto } = await import("./moments.server");
    await saveMomentPhoto(data.slug, data.moment);
    return { ok: true as const };
  });

export const deleteMomentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteMoment } = await import("./moments.server");
    await deleteMoment(data.slug, data.id);
    return { ok: true as const };
  });

export const toggleMomentLoveFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { toggleMomentLove } = await import("./moments.server");
    return toggleMomentLove(data.slug, data.id);
  });

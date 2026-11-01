import { createServerFn } from "@tanstack/react-start";

import type { NannyInput } from "./nannies.types";

export const getNannies = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadNannies } = await import("./nannies.server");
    return loadNannies(data.slug);
  });

export const saveNannyFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; nanny: NannyInput }) => data)
  .handler(async ({ data }) => {
    const { saveNanny } = await import("./nannies.server");
    return saveNanny(data.slug, data.nanny);
  });

export const archiveNannyFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { archiveNanny } = await import("./nannies.server");
    await archiveNanny(data.slug, data.id);
    return { ok: true as const };
  });

export const uploadNannyPhotoFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      slug: string;
      nannyId: string;
      fileName: string;
      contentType: string;
      base64: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { uploadNannyPhoto } = await import("./nannies.server");
    await uploadNannyPhoto(data.slug, data.nannyId, data.fileName, data.contentType, data.base64);
    return { ok: true as const };
  });

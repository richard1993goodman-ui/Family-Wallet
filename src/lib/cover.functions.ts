import { createServerFn } from "@tanstack/react-start";

import type { CoverInput } from "./cover.types";

export const getCover = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadCover } = await import("./cover.server");
    return loadCover(data.slug);
  });

export const requestCoverFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; cover: CoverInput }) => data)
  .handler(async ({ data }) => {
    const { requestCover } = await import("./cover.server");
    return requestCover(data.slug, data.cover);
  });

export const cancelCoverFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { cancelCover } = await import("./cover.server");
    await cancelCover(data.slug, data.id);
    return { ok: true as const };
  });

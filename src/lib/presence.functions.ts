import { createServerFn } from "@tanstack/react-start";

export const heartbeatFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { heartbeat } = await import("./presence.server");
    await heartbeat(data.slug);
    return { ok: true as const };
  });

export const getPeopleFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadPeople } = await import("./presence.server");
    return loadPeople(data.slug);
  });

export const saveMyPhotoFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; contentType: string; base64: string }) => data)
  .handler(async ({ data }) => {
    const { saveMyPhoto } = await import("./presence.server");
    await saveMyPhoto(data.slug, data.contentType, data.base64);
    return { ok: true as const };
  });

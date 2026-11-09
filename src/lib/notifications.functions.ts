import { createServerFn } from "@tanstack/react-start";

export const getBadges = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadBadges } = await import("./notifications.server");
    return loadBadges(data.slug);
  });

export const getInbox = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadInbox } = await import("./notifications.server");
    return loadInbox(data.slug);
  });

export const markSeenFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; feature: string }) => data)
  .handler(async ({ data }) => {
    const { markSeen } = await import("./notifications.server");
    await markSeen(data.slug, data.feature);
    return { ok: true as const };
  });

export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { pushConfig } = await import("./notifications.server");
  return pushConfig();
});

export const savePushSubscriptionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; endpoint: string; tz: string }) => data)
  .handler(async ({ data }) => {
    const { savePushSubscription } = await import("./notifications.server");
    await savePushSubscription(data.slug, data.endpoint, data.tz);
    return { ok: true as const };
  });

export const removePushSubscriptionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; endpoint: string }) => data)
  .handler(async ({ data }) => {
    const { removePushSubscription } = await import("./notifications.server");
    await removePushSubscription(data.slug, data.endpoint);
    return { ok: true as const };
  });

export const getPushPrefsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; endpoint: string }) => data)
  .handler(async ({ data }) => {
    const { loadPushPrefs } = await import("./notifications.server");
    return loadPushPrefs(data.slug, data.endpoint);
  });

export const savePushPrefsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; endpoint: string; muted: string[]; quietStart: number | null; quietEnd: number | null }) => data)
  .handler(async ({ data }) => {
    const { savePushPrefs } = await import("./notifications.server");
    await savePushPrefs(data.slug, data.endpoint, { muted: data.muted, quietStart: data.quietStart, quietEnd: data.quietEnd });
    return { ok: true as const };
  });

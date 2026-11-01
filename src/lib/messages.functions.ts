import { createServerFn } from "@tanstack/react-start";

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadMessages } = await import("./messages.server");
    return loadMessages(data.slug);
  });

export const startThreadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; topic: string; title: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { startThread } = await import("./messages.server");
    const id = await startThread(data.slug, data);
    return { id };
  });

export const replyThreadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; threadId: string; body: string }) => data)
  .handler(async ({ data }) => {
    const { replyThread } = await import("./messages.server");
    await replyThread(data.slug, data.threadId, data.body);
    return { ok: true as const };
  });

export const markThreadReadFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; threadId: string }) => data)
  .handler(async ({ data }) => {
    const { markThreadRead } = await import("./messages.server");
    await markThreadRead(data.slug, data.threadId);
    return { ok: true as const };
  });

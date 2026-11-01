import { createServerFn } from "@tanstack/react-start";

import type { LeaveInput } from "./leave.types";

export const getLeave = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadLeave } = await import("./leave.server");
    return loadLeave(data.slug);
  });

export const requestLeaveFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; leave: LeaveInput }) => data)
  .handler(async ({ data }) => {
    const { requestLeave } = await import("./leave.server");
    return requestLeave(data.slug, data.leave);
  });

export const reviewLeaveFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string; status: "approved" | "declined" }) => data)
  .handler(async ({ data }) => {
    const { reviewLeave } = await import("./leave.server");
    await reviewLeave(data.slug, data.id, data.status);
    return { ok: true as const };
  });

export const cancelLeaveFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { cancelLeave } = await import("./leave.server");
    await cancelLeave(data.slug, data.id);
    return { ok: true as const };
  });

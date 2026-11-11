import { createServerFn } from "@tanstack/react-start";

export const getTodayFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => (await import("./shift.server")).loadToday(String(data.slug ?? "")));

export const startShiftFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => (await import("./shift.server")).startShift(String(data.slug ?? "")));

export const endShiftFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; breakMinutes?: number }) => data)
  .handler(async ({ data }) => (await import("./shift.server")).endShift(String(data.slug ?? ""), Number(data.breakMinutes ?? 0)));

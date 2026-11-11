import { createServerFn } from "@tanstack/react-start";
import type { LiveInSettings } from "./live-in.types";

export const getLiveIn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => (await import("./live-in.server")).loadLiveIn(data.slug));

export const saveLiveInSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; settings: LiveInSettings }) => data)
  .handler(async ({ data }) => {
    await (await import("./live-in.server")).saveLiveInSettings(data.slug, data.settings);
    return { ok: true as const };
  });

export const logLiveInWeekFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; week: { weekStart: string; hoursWorked: number; daysOff: number; note: string } }) => data)
  .handler(async ({ data }) => {
    await (await import("./live-in.server")).logLiveInWeek(data.slug, data.week);
    return { ok: true as const };
  });

export const markPocketMoneyPaidFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string; paid: boolean }) => data)
  .handler(async ({ data }) => {
    await (await import("./live-in.server")).markPocketMoneyPaid(data.slug, data.id, data.paid);
    return { ok: true as const };
  });

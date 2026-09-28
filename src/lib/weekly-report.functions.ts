import { createServerFn } from "@tanstack/react-start";

export const getWeeklyReport = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; anchor?: string }) => data)
  .handler(async ({ data }) => {
    const { loadWeeklyReport } = await import("./weekly-report.server");
    return loadWeeklyReport(data.slug, data.anchor);
  });

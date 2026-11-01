import { createServerFn } from "@tanstack/react-start";

export const getConcierge = createServerFn({ method: "GET" }).inputValidator((data: { slug: string }) => data).handler(async ({ data }) => {
  const { loadConcierge } = await import("./concierge.server");
  return loadConcierge(data.slug);
});

export const requestConciergeFn = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; kind: "payroll" | "curation"; message: string }) => data).handler(async ({ data }) => {
  const { requestConcierge } = await import("./concierge.server");
  await requestConcierge(data.slug, data.kind, data.message);
  return { ok: true as const };
});

export const getSafety = createServerFn({ method: "GET" }).inputValidator((data: { slug: string }) => data).handler(async ({ data }) => {
  const { loadSafety } = await import("./concierge.server");
  return loadSafety(data.slug);
});

export const getSafetyDocumentUrl = createServerFn({ method: "POST" }).inputValidator((data: { slug: string; id: string }) => data).handler(async ({ data }) => {
  const { safetyDocumentUrl } = await import("./concierge.server");
  return { url: await safetyDocumentUrl(data.slug, data.id) };
});
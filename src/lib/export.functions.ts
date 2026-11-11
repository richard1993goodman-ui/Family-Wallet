import { createServerFn } from "@tanstack/react-start";

export const getExportStatusFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug ?? "") }))
  .handler(async ({ data }) => (await import("./export.server")).exportStatus(data.slug));

export const buildExportFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug ?? "") }))
  .handler(async ({ data }) => (await import("./export.server")).buildExport(data.slug));

export const exportFileLinkFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; path: string }) => ({ slug: String(data.slug ?? ""), path: String(data.path ?? "") }))
  .handler(async ({ data }) => (await import("./export.server")).exportFileLink(data.slug, data.path));

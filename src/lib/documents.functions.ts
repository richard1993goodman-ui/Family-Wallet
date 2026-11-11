import { createServerFn } from "@tanstack/react-start";

import type { UploadInput } from "./documents.server";

export const listDocumentsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => (await import("./documents.server")).listDocuments(String(data.slug ?? "")));

export const uploadDocumentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; doc: UploadInput }) => data)
  .handler(async ({ data }) => (await import("./documents.server")).uploadDocument(String(data.slug ?? ""), data.doc));

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => (await import("./documents.server")).deleteDocument(String(data.slug ?? ""), String(data.id ?? "")));

export const documentLinkFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => (await import("./documents.server")).documentLink(String(data.slug ?? ""), String(data.id ?? "")));

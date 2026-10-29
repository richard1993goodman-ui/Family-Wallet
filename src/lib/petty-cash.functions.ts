import { createServerFn } from "@tanstack/react-start";

import type { PettyCashInput } from "./petty-cash.types";

export const getPettyCash = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadPettyCash } = await import("./petty-cash.server");
    return loadPettyCash(data.slug);
  });

export const addPettyCashFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; entry: PettyCashInput }) => data)
  .handler(async ({ data }) => {
    const { addPettyCash } = await import("./petty-cash.server");
    await addPettyCash(data.slug, data.entry);
    return { ok: true as const };
  });

export const deletePettyCashFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; id: string }) => data)
  .handler(async ({ data }) => {
    const { deletePettyCash } = await import("./petty-cash.server");
    await deletePettyCash(data.slug, data.id);
    return { ok: true as const };
  });

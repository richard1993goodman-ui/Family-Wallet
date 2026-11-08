import { createServerFn } from "@tanstack/react-start";

import type { PermissionInput } from "./permissions.types";

export const getPermissions = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const { loadPermissions } = await import("./permissions.server");
    return loadPermissions(data.slug);
  });

export const setPermissionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; permission: PermissionInput }) => data)
  .handler(async ({ data }) => {
    const { setPermission } = await import("./permissions.server");
    await setPermission(data.slug, data.permission);
    return { ok: true as const };
  });

export const removePermissionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; key: string }) => data)
  .handler(async ({ data }) => {
    const { removePermission } = await import("./permissions.server");
    await removePermission(data.slug, data.key);
    return { ok: true as const };
  });

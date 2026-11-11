import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GatedFeature } from "./plan-access";

/** Whether this wallet's plan includes a Household-only tool, so the page can show an upgrade card. */
export const getPlanAccessFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(120), feature: z.enum(["agreement", "house_manual"]) }))
  .handler(async ({ data }) => {
    const { requireSharedFamily } = await import("./family.server");
    const { familyHasFeature } = await import("./plan-access.server");
    const family = await requireSharedFamily(data.slug);
    if (!family) return { allowed: true, access: null };
    return { allowed: await familyHasFeature(family.id, data.feature as GatedFeature), access: family.access };
  });

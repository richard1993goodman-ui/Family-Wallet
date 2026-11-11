import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff } from "./staff.scope";

async function agencyOf(context: unknown): Promise<string | null> {
  const scope = await requireStaff(context);
  if (scope.kind !== "owner") throw new Error("Forbidden");
  return null;
}

export const getMyAgencyTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await agencyOf(context);
    const { termsForAgency } = await import("./agency-terms.server");
    return termsForAgency(agencyId);
  });

export const uploadMyAgencyTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fileName: string; contentType: string; base64: string }) => d)
  .handler(async ({ data, context }) => {
    const agencyId = await agencyOf(context);
    const { saveAgencyTerms } = await import("./agency-terms.server");
    await saveAgencyTerms(agencyId, data.fileName.slice(0, 160), data.contentType, data.base64);
    return { ok: true as const };
  });

export const deleteMyAgencyTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agencyId = await agencyOf(context);
    const { removeAgencyTerms } = await import("./agency-terms.server");
    await removeAgencyTerms(agencyId);
    return { ok: true as const };
  });

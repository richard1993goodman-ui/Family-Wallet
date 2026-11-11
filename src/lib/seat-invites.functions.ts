import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Agency seat tools are for partner agencies only; the owner has no seats. */
async function partnerAgencyId(context: unknown) {
  const { requireStaff } = await import("./staff.scope");
  const scope = await requireStaff(context);
  if (scope.kind !== "partner") throw new Error("Forbidden");
  return scope.agencyId;
}

export const getSeatBoardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./seat-invites.server")).getSeatBoard(await partnerAgencyId(context)));

export const createSeatInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slot: number; familyName: string; email?: string; sendEmail?: boolean }) => d)
  .handler(async ({ data, context }) =>
    (await import("./seat-invites.server")).createSeatInvite(await partnerAgencyId(context), Number(data.slot), String(data.familyName ?? ""), {
      email: String(data.email ?? ""),
      sendEmail: data.sendEmail === true,
      createdBy: context.userId,
    }),
  );

export const resendSeatInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string }) => d)
  .handler(async ({ data, context }) => (await import("./seat-invites.server")).resendSeatInvite(await partnerAgencyId(context), data.inviteId));

export const revokeSeatInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string }) => d)
  .handler(async ({ data, context }) => (await import("./seat-invites.server")).revokeSeatInvite(await partnerAgencyId(context), data.inviteId));

export const releaseSeatFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string }) => d)
  .handler(async ({ data, context }) => (await import("./seat-invites.server")).releaseSeat(await partnerAgencyId(context), data.inviteId));

/* Public: the family opens its emailed link. */
export const lookupInviteFn = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => (await import("./seat-invites.server")).lookupInvite(String(data.token ?? "")));

export const lookupInviteByCodeFn = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data }) => (await import("./seat-invites.server")).lookupInviteByCode(String(data.code ?? "")));

export const acceptInviteFn = createServerFn({ method: "POST" })
  .inputValidator((d: { token?: string; code?: string; familyName: string }) => d)
  .handler(async ({ data }) => (await import("./seat-invites.server")).acceptInvite(String(data.token ?? ""), String(data.familyName ?? ""), String(data.code ?? "")));

/** A Stripe-hosted page to upgrade to the next tier (pays the difference now) or to manage billing. */
export const agencyBillingLinkFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "upgrade" | "manage" }) => d)
  .handler(async ({ data, context }) => {
    const agencyId = await partnerAgencyId(context);
    const { agencyBillingUrl } = await import("./billing.server");
    const { siteUrl } = await import("./site");
    const mode = data.mode === "manage" ? "manage" : "upgrade";
    return agencyBillingUrl(agencyId, mode, siteUrl(mode === "upgrade" ? "/admin?billing=done" : "/admin"));
  });

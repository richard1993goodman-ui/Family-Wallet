import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Whether accounts are on, and whether the person at this device can create a login. */
export const getAccountStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug ?? "") }))
  .handler(async ({ data }) => (await import("./account.server")).accountStatus(data.slug));

export const startAccountClaim = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; email: string }) => ({
    slug: String(data.slug ?? ""),
    email: String(data.email ?? ""),
  }))
  .handler(async ({ data }) =>
    (await import("./account.server")).startClaim(data.slug, data.email),
  );

export const finishAccountClaim = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: String(data.token ?? "").slice(0, 200) }))
  .handler(async ({ data }) => (await import("./account.server")).completeClaim(data.token));

/** Wallets offered to the signed-in person because their verified email is the wallet's contact email. */
export const findMyWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const offers = await (await import("./account.server")).walletsForEmail(context.userId);
    return offers.map(({ id, familyName }) => ({ id, familyName }));
  });

export const linkMyWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { familyId: string }) => ({
    familyId: String(data.familyId ?? "").slice(0, 64),
  }))
  .handler(async ({ data, context }) =>
    (await import("./account.server")).linkWalletByEmail(context.userId, data.familyId),
  );

/** Households the signed-in person belongs to. */
export const myHouseholds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./account.server")).householdsFor(context.userId));

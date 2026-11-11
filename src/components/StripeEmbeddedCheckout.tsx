import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useMemo } from "react";

import type { Interval, PlanId } from "@/lib/billing.config";
import { createCheckoutSession, createContinueCheckout } from "@/lib/billing.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

/**
 * Stripe's own payment form, rendered inline. The client secret is fetched once per
 * plan, so opening a different plan mounts a fresh provider rather than reusing a
 * stale one.
 */
export function StripeEmbeddedCheckout({ plan, interval, continueSlug }: { plan: PlanId; interval: Interval; continueSlug?: string }) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        // With a slug this pays for that existing wallet instead of creating a new one.
        const result = continueSlug
          ? await createContinueCheckout({ data: { slug: continueSlug, plan, interval, environment: getStripeEnvironment() } })
          : await createCheckoutSession({ data: { plan, interval, environment: getStripeEnvironment() } });
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
        return result.clientSecret;
      },
    }),
    [plan, interval, continueSlug],
  );

  return (
    <div id="checkout" className="min-h-[26rem]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

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
export function StripeEmbeddedCheckout({
  plan,
  interval,
  slug,
  continueSlug,
}: {
  plan: PlanId;
  interval: Interval;
  /** Buying or upgrading from inside an existing wallet. */
  slug?: string;
  /** A wallet whose agency stopped funding it (or that was paused) switching to its own plan. */
  continueSlug?: string;
}) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async () => {
        const environment = getStripeEnvironment();
        const result = continueSlug
          ? await createContinueCheckout({ data: { slug: continueSlug, plan, interval, environment } })
          : await createCheckoutSession({ data: { plan, interval, slug, environment } });
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
        return result.clientSecret;
      },
    }),
    [plan, interval, slug, continueSlug],
  );

  return (
    <div id="checkout" className="min-h-[26rem]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

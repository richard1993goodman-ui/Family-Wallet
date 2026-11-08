import { createFileRoute } from "@tanstack/react-router";

import { isInterval, isPlan, priceLookupKey } from "@/lib/billing.config";
import { stripe } from "@/lib/stripe.server";

// POST a form with `plan` (family | household) and `interval` (month | year).
// Starts a Stripe Checkout subscription and sends the browser there.
export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const plan = form.get("plan");
        const interval = form.get("interval");
        if (!isPlan(plan) || !isInterval(interval)) return new Response("Unknown plan", { status: 400 });

        const { data } = await stripe<{ data: { id: string }[] }>(
          "/prices",
          { lookup_keys: [priceLookupKey(plan, interval)], active: true },
          "GET",
        );
        const price = data[0];
        if (!price) return new Response("This plan is not available yet", { status: 404 });

        const origin = new URL(request.url).origin;
        const metadata = { app: "family_wallet", plan, interval };
        const session = await stripe<{ url: string }>("/checkout/sessions", {
          mode: "subscription",
          line_items: [{ price: price.id, quantity: 1 }],
          automatic_tax: { enabled: true },
          billing_address_collection: "required",
          allow_promotion_codes: true,
          metadata,
          subscription_data: { metadata },
          success_url: `${origin}/subscribed?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/pricing`,
        });
        return Response.redirect(session.url, 303);
      },
    },
  },
});

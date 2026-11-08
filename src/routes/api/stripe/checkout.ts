import { createFileRoute } from "@tanstack/react-router";

import { isInterval, isPlan, priceLookupKey } from "@/lib/billing.config";
import { stripe } from "@/lib/stripe.server";

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A small readable page, so a failed checkout says what went wrong instead of a blank error. */
function failure(status: number, reason: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Checkout unavailable | The Family Wallet</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#2a2420"><h1 style="font-size:1.5rem">We couldn't start checkout</h1><p style="line-height:1.6">Nothing has been charged. Please try again in a few minutes, or get in touch and we will set you up by hand.</p><p><a href="/pricing" style="color:#2f5d4a">Back to pricing</a></p><p style="margin-top:2rem;font-size:.8125rem;color:#6b5f55">Reason: ${escapeHtml(reason)}</p></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// POST a form with `plan` (family | household) and `interval` (month | year).
// Starts a Stripe Checkout subscription and sends the browser there.
export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const plan = form.get("plan");
          const interval = form.get("interval");
          if (!isPlan(plan) || !isInterval(interval)) return failure(400, "Unknown plan.");

          const { data } = await stripe<{ data: { id: string }[] }>(
            "/prices",
            { lookup_keys: [priceLookupKey(plan, interval)], active: true },
            "GET",
          );
          const price = data[0];
          if (!price) {
            return failure(
              404,
              `No Stripe price found for ${priceLookupKey(plan, interval)}. Check the Stripe key is for the same mode (live or test) as the prices.`,
            );
          }

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
        } catch (error) {
          console.error("Stripe checkout failed", error);
          return failure(502, error instanceof Error ? error.message : "Unexpected error.");
        }
      },
    },
  },
});

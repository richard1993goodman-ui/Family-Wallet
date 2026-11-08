import { createFileRoute } from "@tanstack/react-router";

import { verifyStripeSignature } from "@/lib/stripe.server";

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

// Stripe calls this for subscription events. It must be given the raw body to check the signature.
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
        const body = await request.text();
        const valid = await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret);
        if (!valid) return new Response("Invalid signature", { status: 400 });

        const event = JSON.parse(body) as StripeEvent;
        const { provisionFromSession, applySubscription } = await import("@/lib/billing.server");
        try {
          if (event.type === "checkout.session.completed") {
            const session = event.data.object as { id: string; metadata?: Record<string, string> };
            if (session.metadata?.["app"] === "family_wallet") await provisionFromSession(session.id);
          } else if (
            event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.deleted"
          ) {
            await applySubscription(event.data.object as Parameters<typeof applySubscription>[0]);
          }
        } catch (error) {
          // A non-2xx reply makes Stripe retry the event for up to three days.
          console.error("Stripe webhook failed", event.type, error);
          return new Response("Webhook handler failed", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});

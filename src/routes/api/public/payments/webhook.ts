import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe calls this for every subscription event. It lives under /api/public so the
 * platform lets Stripe through without a session, which means the signature check
 * below is the only thing standing between a stranger and the wallet table.
 */
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid or missing env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const environment = rawEnv;

        const { verifyWebhook } = await import("@/lib/stripe.server");
        let event: { type: string; data: { object: Record<string, unknown> } };
        try {
          event = await verifyWebhook(request, environment);
        } catch (error) {
          console.error("Webhook signature rejected", error);
          return new Response("Invalid signature", { status: 400 });
        }

        const { provisionFromSession, applySubscription } = await import("@/lib/billing.server");
        try {
          if (event.type === "checkout.session.completed") {
            const session = event.data.object as {
              id: string;
              metadata?: Record<string, string>;
              payment_status?: string;
            };
            // A session is not proof of money yet: bank transfers settle days later.
            if (
              session.metadata?.["app"] === "family_wallet" &&
              session.payment_status !== "unpaid"
            ) {
              await provisionFromSession(session.id, environment);
            }
          } else if (event.type === "checkout.session.async_payment_succeeded") {
            const session = event.data.object as { id: string; metadata?: Record<string, string> };
            if (session.metadata?.["app"] === "family_wallet") {
              await provisionFromSession(session.id, environment);
            }
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

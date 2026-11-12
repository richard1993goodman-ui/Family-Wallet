import { createFileRoute } from "@tanstack/react-router";

/**
 * RevenueCat calls this for every in-app subscription event (purchase, renewal, cancellation, expiry).
 * It lives under /api/public so the platform lets RevenueCat through without a session, which means the shared
 * secret check below is the only thing standing between a stranger and the wallet table.
 */
export const Route = createFileRoute("/api/public/revenuecat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyRevenueCatAuth, applyIapEvent } = await import("@/lib/iap.server");
        if (!verifyRevenueCatAuth(request.headers.get("authorization"))) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        try {
          const result = await applyIapEvent(body);
          return Response.json({ received: true, ...result });
        } catch (error) {
          // A failure answers 500 so RevenueCat retries the same event later.
          console.error("RevenueCat event failed", error instanceof Error ? error.message : error);
          return new Response("Failed", { status: 500 });
        }
      },
    },
  },
});

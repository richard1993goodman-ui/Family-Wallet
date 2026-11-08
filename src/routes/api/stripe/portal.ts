import { createFileRoute } from "@tanstack/react-router";

// POST a form with the wallet `slug`. Opens Stripe's billing portal for a household that paid
// through the pricing page, where they can update their card, download invoices or cancel.
export const Route = createFileRoute("/api/stripe/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const slug = String((await request.formData()).get("slug") ?? "");
        if (!/^[a-z0-9-]{1,40}$/.test(slug)) return new Response("Unknown wallet", { status: 400 });

        const { requireFamily } = await import("@/lib/family.server");
        const family = await requireFamily(slug);
        if (!family) return new Response("Please open your wallet first", { status: 401 });

        const origin = new URL(request.url).origin;
        const { portalUrlFor } = await import("@/lib/billing.server");
        const url = await portalUrlFor(family.id, `${origin}/w/${slug}`);
        if (!url) return new Response("No subscription found", { status: 404 });
        return Response.redirect(url, 303);
      },
    },
  },
});

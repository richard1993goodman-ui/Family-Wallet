import { createFileRoute } from "@tanstack/react-router";

// The service worker calls this after an empty push to learn what to show. See notifications.server.ts.
export const Route = createFileRoute("/api/push/latest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
        const { latestForEndpoint } = await import("@/lib/notifications.server");
        const result = await latestForEndpoint(typeof endpoint === "string" ? endpoint : "");
        return new Response(JSON.stringify(result), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
      },
    },
  },
});

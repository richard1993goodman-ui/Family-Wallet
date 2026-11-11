import { createFileRoute } from "@tanstack/react-router";

// Called once a day by the scheduler with the project's cron secret. See lifecycle.server.ts.
export const Route = createFileRoute("/api/public/lifecycle-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { runLifecycle } = await import("@/lib/lifecycle.server");
        const report = await runLifecycle();
        return new Response(JSON.stringify(report), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";

export const claimSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    const { provisionFromSession } = await import("./billing.server");
    const { markUnlocked } = await import("./wallet.server");
    const result = await provisionFromSession(data.sessionId);
    if (result.status === "ready") {
      // Payment is verified with Stripe above, so the buyer goes straight in.
      await markUnlocked(result.slug);
    }
    return result;
  });

import { createServerFn } from "@tanstack/react-start";

export const claimSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    const { provisionFromSession } = await import("./billing.server");
    const { markUnlocked } = await import("./wallet.server");
    const { emailConfigured } = await import("./email.server");
    const result = await provisionFromSession(data.sessionId);
    if (result.status === "ready") {
      // Payment is verified with Stripe above, so the buyer goes straight in.
      await markUnlocked(result.slug);
    }
    return { ...result, emailing: emailConfigured() };
  });

/** "Send me my details again". Replies the same way whether or not the address has a wallet. */
export const requestWalletDetails = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { sendWalletDetails } = await import("./billing.server");
    let client = "unknown";
    try {
      const request = getRequest();
      const forwarded = request.headers.get("x-forwarded-for") ?? "";
      client = (forwarded.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown").trim();
    } catch {
      // No request context: fall back to a shared bucket, which only makes the limit stricter.
    }
    await sendWalletDetails(String(data.email ?? ""), client);
    return { ok: true as const };
  });

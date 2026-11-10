import { loadStripe, type Stripe as StripeJS } from "@stripe/stripe-js";

export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/**
 * The environment comes from the token prefix, never from a default: a build with no token
 * is an unfinished go-live, and routing that to live would charge real cards by accident.
 */
function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Stripe payments are not configured for this build. Complete Stripe go-live in your Lovable project to enable production checkout.",
  );
}

/** False when this build has no payment token, so pages can fall back instead of crashing. */
export function paymentsConfigured() {
  return Boolean(
    clientToken?.startsWith("pk_test_") || clientToken?.startsWith("pk_live_"),
  );
}

let stripePromise: Promise<StripeJS | null> | null = null;

export function getStripe(): Promise<StripeJS | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

// In-app purchase rules, kept pure so they are easy to test. The store (Apple) is the source of truth for whether
// a subscription is live; RevenueCat relays what Apple says. We never decide this ourselves.

export type IapState = "trial" | "active" | "grace" | "expired";

export type IapEvent = {
  eventId: string;
  type: string;
  /** Our person id: the app tells RevenueCat who is signed in. */
  personId: string;
  product: string | null;
  /** Apple's original transaction id. Stays the same across renewals. */
  externalRef: string | null;
  environment: "production" | "sandbox";
  periodEnd: string | null;
  trial: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads a RevenueCat webhook body. Null when it is not a usable event. */
export function parseIapEvent(body: unknown): IapEvent | null {
  const e = (body as { event?: Record<string, unknown> } | null)?.event;
  if (!e || typeof e !== "object") return null;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const id = str(e["id"]);
  const type = str(e["type"]);
  const personId = str(e["app_user_id"]);
  // Anonymous RevenueCat users ("$RCAnonymousID:...") belong to nobody we know: ignore them.
  if (!id || !type || !personId || !UUID.test(personId)) return null;
  const ms = typeof e["expiration_at_ms"] === "number" ? (e["expiration_at_ms"] as number) : null;
  return {
    eventId: id,
    type,
    personId,
    product: str(e["product_id"]),
    externalRef: str(e["original_transaction_id"]),
    environment: str(e["environment"])?.toUpperCase() === "SANDBOX" ? "sandbox" : "production",
    periodEnd: ms ? new Date(ms).toISOString() : null,
    trial: str(e["period_type"])?.toUpperCase() === "TRIAL",
  };
}

/** What a store event means for the entitlement. Null means the event changes nothing we track. */
export function stateFor(event: Pick<IapEvent, "type" | "trial">): IapState | null {
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
      return event.trial ? "trial" : "active";
    // The person turned off renewal: still paid until the period ends, so access continues.
    case "CANCELLATION":
      return event.trial ? "trial" : "active";
    // Apple could not collect the payment and is retrying: keep access while it does.
    case "BILLING_ISSUE":
      return "grace";
    case "EXPIRATION":
      return "expired";
    default:
      return null;
  }
}

/** Whether the entitlement lets the wallet stay open right now. */
export function entitlementOpen(state: IapState, periodEnd: string | null, now = Date.now()) {
  if (state === "expired") return false;
  return !periodEnd || new Date(periodEnd).getTime() > now;
}

/** The wallet status to set: the same two words the Stripe route uses. */
export const walletStatusFor = (open: boolean) =>
  open ? ("active" as const) : ("cancelled" as const);

/** CANCELLATION means "will not renew"; a billing issue leaves it unknown; anything else that keeps access renews. */
export const willRenewFor = (type: string) =>
  type === "CANCELLATION" || type === "EXPIRATION" ? false : type === "BILLING_ISSUE" ? null : true;

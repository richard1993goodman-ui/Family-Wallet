// Creates the Stripe Products and Prices the checkout route looks up, from src/lib/billing.config.ts.
// Safe to re-run: prices whose lookup key already exists are skipped.
//
// Test mode first (recommended):
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-seed.ts
// Live mode, once you are happy:
//   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-seed.ts --live
import { PLANS, priceLookupKey, type Interval, type PlanId } from "../src/lib/billing.config.ts";
import { stripe } from "../src/lib/stripe.server.ts";

const key = process.env["STRIPE_SECRET_KEY"] ?? "";
const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
if (live && !process.argv.includes("--live")) {
  throw new Error("That is a live-mode key. Re-run with --live if you mean to create live products.");
}
if (!live && !/^(sk|rk)_test_/.test(key)) {
  throw new Error("Set STRIPE_SECRET_KEY to a Stripe secret key (sk_test_... or sk_live_...).");
}
console.log(`Using ${live ? "LIVE" : "test"} mode`);

for (const [plan, config] of Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][]) {
  let productId: string | null = null;
  for (const interval of ["month", "year"] as Interval[]) {
    const lookup = priceLookupKey(plan, interval);
    const { data } = await stripe<{ data: { product: string }[] }>(
      "/prices",
      { lookup_keys: [lookup] },
      "GET",
    );
    if (data[0]) {
      productId = data[0].product;
      console.log(`skip   ${lookup} (exists)`);
      continue;
    }
    productId ??= (
      await stripe<{ id: string }>("/products", {
        name: config.name,
        description: config.description,
        metadata: { app: "family_wallet", plan },
      })
    ).id;
    await stripe<unknown>("/prices", {
      product: productId,
      currency: "gbp",
      unit_amount: config.pence[interval],
      tax_behavior: "exclusive", // published prices are "+ VAT"
      lookup_key: lookup,
      recurring: { interval },
    });
    console.log(`create ${lookup}  £${(config.pence[interval] / 100).toFixed(2)}/${interval}`);
  }
}

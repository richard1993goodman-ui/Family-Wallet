# In-app purchase setup: what only you can do

Prepared 12 Nov 2026. Goes with `stage-c2-new-family-signup-design.md` (section 6a). The code side is built and waiting (`entitlements` migration, `/api/public/revenuecat` webhook). These are the accounts and settings only you can create. **Never paste a secret or key into the chat**; put each one where this list says.

Work through it in order. Each part says what it unlocks.

## A. Apple: agreements and money (unlocks selling anything)
1. App Store Connect > **Business** (or Agreements, Tax, and Banking): accept the **Paid Apps Agreement**.
2. Add your **bank account** and **tax information** (UK). Apple will not let you sell until this shows "Active". It can take a few days to be approved.
3. Apply for the **App Store Small Business Program** (Apple's fee drops from 30% to 15% while you earn under $1M a year). Apply before your first sale: it is not backdated.

## B. Apple: the subscription (unlocks testing a purchase)
In App Store Connect > your app (**io.familywallet.app**) > **Monetization > Subscriptions**:
1. Create a **subscription group** called "Family Wallet".
2. Add two subscriptions in that group:
   - Monthly. Suggested product ID: `fw_family_month`.
   - Annual. Suggested product ID: `fw_family_year`.
3. Prices: the agreed plan is £19.99 a month or £199 a year. Apple only offers fixed price points, so pick the nearest available one and **confirm the final prices with me before they go live** (I will not guess them).
4. Add an **introductory offer**: free trial, **7 days**, for new subscribers, on both.
5. Fill in the display name, description and a review screenshot for each. The description must say what the family gets, in plain words.
6. Leave them in "Ready to Submit"; they go to review together with the app build.

## C. Apple: test accounts (unlocks testing on your iPhone)
1. App Store Connect > **Users and Access > Sandbox > Testers**: create a sandbox tester with an email address you control but have not used for an Apple ID.
2. On the iPhone: Settings > App Store > **Sandbox Account**, sign in with it. Sandbox purchases cost nothing and renew every few minutes.

## D. RevenueCat (unlocks the app seeing purchases)
1. Create a free account at revenuecat.com, a project called "Family Wallet", and add an **iOS app** with bundle ID `io.familywallet.app`.
2. In App Store Connect > **Users and Access > Integrations > In-App Purchase**, create a key and upload it to RevenueCat when it asks. (Keep the downloaded `.p8` file private.)
3. In RevenueCat: add the two products, create one **entitlement** called `family`, and one **offering** called `default` containing both.
4. Copy the **public SDK key** for iOS (it starts `appl_`). It is designed to sit inside the app, but tell me when you have it and I will say where it goes; do not post it anywhere public.
5. **Webhook** (RevenueCat > Integrations > Webhooks):
   - URL: `https://familywallet.io/api/public/revenuecat`
   - Authorization header value: `Bearer ` followed by a long random secret. Make one in your terminal with `openssl rand -hex 32 | pbcopy` and paste it straight into RevenueCat.
6. In **Lovable > Settings > Secrets**, add `REVENUECAT_WEBHOOK_SECRET` with the **same random secret** (without the word `Bearer`). Publish after adding it.

## E. What I do once A to D are ready
- Apply the entitlements migration, with your OK.
- Add the RevenueCat plugin to the iOS app, tell RevenueCat who is signed in (our person id), and build the subscribe screen, restore button and "manage subscription" link.
- Upload a new TestFlight build; you buy with the sandbox account and we watch the event arrive.
- Only after a real purchase works end to end: remove family checkout from the website and point it to the app.

## F. Before you submit to the App Store
- A written policy check of the rules on steering and agency pricing (see the design note).
- In-app account deletion (Apple requires it for any app that creates accounts).
- Privacy details in App Store Connect that match what the app collects.

## Not covered yet
Android (Google Play Billing) waits on the Play Console account verification. Until then Android families can only be agency-sponsored.

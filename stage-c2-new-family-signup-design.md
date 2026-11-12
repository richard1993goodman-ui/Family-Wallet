# Stage C2: sign-up for new families (design note, nothing built)

Prepared 12 Nov 2026. Extends `stage-c-account-layer-design.md` (which covers claiming an account from inside an existing wallet). This note covers a **brand-new family arriving in the app with no wallet yet**, as the master brief asks: sign in with Apple, Google or email, no invitation code, no emailed passwords.

Decided already: existing families keep link + code unchanged; Apple / Google / email are added for new families (12 Nov); magic link first, no SMS (11 Nov); Plan & Billing sits under More.

## 1. What is true today
- A new independent family arrives by **pricing page, Stripe checkout, `/subscribed`**, where `provisionFamily` creates the wallet and shows a link and code. No identity exists before payment.
- Supabase Auth is used only by the owner and agency staff (password plus authenticator app). **No Apple or Google provider is configured or coded.**
- The account tables (`people`, `household_members`, `account_claims`) and the claim flow exist and are applied live, behind `ACCOUNTS_ENABLED` (server) and `VITE_ACCOUNTS_ENABLED` (build). *Whether those are on in production is unverified.*
- The whole product is keyed on a wallet **slug**; every server function asks `sessionAccess(slug)`. An account user needs to resolve to a slug the same way.

## 2. The proposed new-family journey
1. Open the app. Choose **Continue with Apple**, **Continue with Google**, or **email** (one-time link). "I have a link or code" stays for existing and invited users.
2. Identity is created: `auth.users`, then `people`.
3. **Entitlement check** (one server function): existing membership, agency-sponsored invite, active direct subscription, or none.
4. With no entitlement, the family is offered the plan (see decision 1). With one, go straight to onboarding.
5. Onboarding (family, emergency contacts, children, staff), saved and resumable. The wallet row is created at the first save, owned by the person's `owner` membership. A code is generated silently as a hashed backup and is **not shown** unless the family asks for one.
6. Land on Home.

## 3. The hard parts, said plainly
- **Google blocks sign-in inside embedded webviews** (error `disallowed_useragent`). The Capacitor shell loads the website in a webview, so Google (and Apple) sign-in must use a **native plugin** or the system browser, then pass the ID token to Supabase (`signInWithIdToken`). This needs a **new TestFlight / Play build**, not just a website publish.
- **Apple rules that apply:** offering Google requires **Sign in with Apple** (4.8). Any app that creates accounts must let people **delete their account inside the app** (5.1.1(v)); today deletion is owner-run. Digital subscriptions bought outside the app can be restricted (3.1.1) and need **Restore purchases**. These need a written policy review before store submission; I am not claiming a conclusion.
- **Email-only users on the web** are easy and need no native work: magic link works today in principle.
- **Apple private relay emails** mean the email on file may not be the family's real address. Reminder and lifecycle emails must go through the relay, and recovery should not depend on matching an address.

## 4. Data model additions (draft, not applied)
- `entitlements` (household, source: `athletemannies_membership | agency_sponsored | direct_stripe | apple_iap | google_iap`, state, period, external reference) and append-only `entitlement_events`. `families.entitlement` becomes derived. Subscription and entitlement stay separate from household data.
- An unfinished onboarding is a wallet row flagged `onboarding_step`, so progress saves and resumes. No separate draft table.
- No change to existing tables for existing families.

## 5. Delivery steps (estimates; one developer with Claude)
| Step | Scope | Effort |
|---|---|---|
| C7a | Email magic-link sign-up on the web, `resolveAccess` for account users, entitlement check, no native work | 1.5 to 2 weeks |
| C7b | Guided onboarding wizard with save and resume (family, emergency, children, staff) | 2 weeks |
| C7c | Entitlements table, sponsored and direct sources, restore-purchase hook | 1.5 weeks |
| C7d | Apple and Google through native plugins, new store build, TestFlight test | 2 to 3 weeks |
| C7e | In-app account deletion plus export (reuses lifecycle) | 1 week |

C7a to C7c are web-only and can be tested on the website and TestFlight as it stands. C7d is the one that needs your Apple and Google accounts.

## 6. Decisions needed from you
1. **How does a new family pay?** Keep web checkout (then the app sells nothing and must pass review as a companion), or add in-app purchase for direct families. Open since 11 Nov; needs the policy review.
2. **Free trial?** The brief lists trial periods; none exists today. If yes: length, and whether a card is required.
3. Is `ACCOUNTS_ENABLED` on in production today? (Check the Lovable secrets list together.)
4. Order: web email sign-up first (C7a to C7c), then Apple/Google (C7d). Recommended.
5. Co-parents at launch or later (still open from the Stage C note).

## 7. What only you can do
- Apple Developer: create a Services ID, a Sign in with Apple key, and the return URL (uses Team `T3KFJ4JY67`).
- Google Cloud: create OAuth clients (web, iOS, Android).
- Supabase: switch on the Apple, Google and email providers and paste those values (secret values stay out of chat).

## 8. Risks
Account takeover through the claim and sign-up paths (tokens single-use, hashed, short expiry, rate-limited); two sources of truth during the dual-run (one `resolveAccess`, with a test that every server function uses it); abandoned half-finished wallets (expire draft wallets after 30 days with a reminder); store-review delay on C7d.

Nothing here is implemented.

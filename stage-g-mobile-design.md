# Stage G design: the iOS and Android apps (draft for review, nothing built)

Prepared 11 Nov 2026. Built from the repo and from Apple's and Google's current published policies (read 11 Nov 2026). Store rules change; I have quoted only what I read and flagged what I have not.

## 1. What exists today

- A **Capacitor 8 shell** (`capacitor.config.ts`, `ios/`, `android/`, app id `io.familywallet.app`) that loads the live site at `https://familywallet.io` (remote-URL mode). `mobile/www` is only an offline fallback page.
- Plugins installed: **splash screen and status bar only.** No native push, no secure storage, no biometrics, no camera or file plugins, no share sheet, no deep links.
- Android manifest has one permission (internet). No `assetlinks.json`, no iOS associated domains, no custom URL scheme.
- The web app is **server-rendered** (TanStack Start): its screens call server functions on the live site, so it cannot be copied into the app as static files without a large change.
- Web push exists (service worker and VAPID) and works in a browser, but **not inside the iOS and Android webview**.
- The shell adds a `native-app` marker, and the pricing and billing pages already say to buy outside the app when it is set (so the app does not sell subscriptions).
- Store links are placeholders (`app-links.ts`); the apps have not been submitted.

## 2. The store risks, from the policies

**Apple (App Review Guidelines).**
- **4.2 Minimum Functionality:** the app "should include features, content, and UI that elevate it beyond a repackaged website", and apps that are not useful, unique or app-like "don't belong on the App Store". A bare webview of the site is the classic rejection. This is the main risk of the current remote-URL shell.
- **3.1.1 In-App Purchase:** features unlocked by subscription must use in-app purchase. Outside the US storefront, apps may not include buttons, links or other calls to action pointing to other purchase methods, unless a regional entitlement applies. We already hide purchase screens in the app; that must stay and be tested.
- I have **not** read Apple's rules on apps whose accounts are created and paid for elsewhere (3.1.3) or on sponsored or enterprise access in full. Agency sponsorship is not assumed to be exempt (your own rule). This needs a proper read and, if unclear, a question to App Review before submission.

**Google Play (Payments policy).**
- Digital subscriptions are expected to use Play Billing; outside the app you are free to tell users about other ways to buy, and the US has court-driven programmes for external links and alternative billing with reporting and fees starting in late 2026. I have not worked through what applies to an app whose subscriptions are bought on the web or sponsored by an agency, and will not assume.

## 3. Options

| Option | What it is | Cost | Store risk | Notes |
|---|---|---|---|---|
| **A. Remote shell as is** | Capacitor loads the site | none | High (Apple 4.2) | Fine for internal testing only |
| **B. Remote shell plus real native features** | Same shell, plus native push, biometric lock, camera and document capture, share sheet, deep links | 4 to 6 weeks | Medium to low | **Recommended**: gives the app "app-like" substance without rebuilding the product |
| **C. Bundled single-page app** | Build the web UI as static files inside the app, calling a remote API | 3 to 6 months | Low | Large rewrite of the server-rendered screens; offline use possible; only if B is rejected |
| **D. Fully native apps** | Swift and Kotlin | 6+ months each | Lowest | Not recommended for a small team |

## 4. Recommended plan (Option B)

**G1, deep links (about 1 week).** Apple Universal Links and Android App Links for `/join/<token>`, `/claim/<token>`, `/w/<slug>`: host `apple-app-site-association` and `assetlinks.json` on the site, add associated domains and intent filters. The invitation link opens the app if installed, otherwise the web page. Installing from the link and carrying the invite across is **not** assumed: the page will say "open this link again after installing".

**G2, native push (about 1 to 2 weeks).** Replace web push inside the app with APNs and FCM through Capacitor's push plugin; device tokens stored per person; the existing generic-summary rule stays (nothing private on lock screens). Needs an Apple developer account, push key and a Firebase project: yours to create.

**G3, secure features (about 1 to 2 weeks).** Keychain and Keystore for the stored session, optional Face ID or fingerprint lock, camera and photo picker for documents and moments, native share sheet for invitations.

**G4, payment-policy review and store listing (about 1 week plus waiting).** Read the remaining Apple and Google rules, write the "access is provided by your household or agency; no purchases in the app" position, check every screen shown inside the app (pricing, billing, upgrade prompts, the demo), prepare listings, privacy details and screenshots.

**G5, pilot builds (about 1 to 2 weeks).** TestFlight and Google Play internal testing with one or two pilot agencies, collect crash reports, fix, then submit.

**Dependency to note:** every new Capacitor plugin changes `package.json`, and Lovable's `bun.lock` currently has to be reconciled by you for new packages to build there.

## 5. What you need to provide

An Apple Developer Program membership (paid yearly), a Google Play developer account (one-off fee), a Firebase project for Android push, the final app name and icon, and a privacy policy URL. Store accounts and keys are yours to create; I will not handle credentials.

## 6. Decisions needed

1. Go with **Option B**, and keep C as the fallback if Apple rejects under 4.2?
2. Will the apps be **free companions with no purchase inside them** (access via a household's own plan or an agency)? That is the position I would design to.
3. Who creates the Apple and Google developer accounts and the Firebase project, and when?
4. Which pilot agency and devices for TestFlight and internal testing?
5. Approve a proper read of Apple 3.1.3 and Google's billing rules, with a solicitor or App Review question if they are unclear, before any submission?

Deep links readiness (G1, partial): see `mobile/deep-links/README.md`. The link validator and templates are built and tested; the native changes wait for your Apple Team ID, Android signing fingerprint and a yes to adding `@capacitor/app`.

# Deep links (Stage G1): what is ready and what is still needed

Goal: tapping a Family Wallet invitation or wallet link on a phone opens the installed app straight to that page, and opens the website if the app is not installed. Installing the app **from** the link and carrying the invitation across is not supported and not promised: the web page tells the person to open the link again after installing.

## Ready now

- `src/lib/deep-links.ts`: the check that decides whether a link is ours and where it goes. Only `https://familywallet.io` and these first path parts are allowed: `join`, `claim`, `w`, `nanny`, `account`. Other hosts, look-alike hosts, `http`, odd schemes and pages such as `/admin` or `/api` are refused. It is tested.
- The two link files as templates here (`apple-app-site-association.template.json`, `assetlinks.template.json`). **They are not served yet** (a test checks that `public/.well-known/` has no copies), because they contain placeholders.

## What I need from you

1. **Apple Team ID** (from your Apple Developer account, Membership page). It replaces `REPLACE_WITH_APPLE_TEAM_ID`.
2. **Android release signing certificate SHA-256 fingerprint** (from Play Console "App signing", or the keystore). It replaces `REPLACE_WITH_RELEASE_SIGNING_CERTIFICATE_SHA256`. If you use Play App Signing, use Google's fingerprint, not the upload key's.
3. Permission to add one dependency, **`@capacitor/app`** (the official plugin that tells the app which link opened it). Adding a package changes `package.json`, and Lovable's `bun.lock` then needs reconciling or its build may fail, so I will not add it without your yes.

## What I will do once I have them

1. Copy the filled templates to `public/.well-known/apple-app-site-association` (no file extension, served as JSON) and `public/.well-known/assetlinks.json`.
2. Add `@capacitor/app` and a small listener: when the app is opened by a link, run `deepLinkPath(url)` and, if it returns a path, load that path in the app. Anything else is ignored.
3. Android: add an `autoVerify` intent filter for `https://familywallet.io` on the four path prefixes to `AndroidManifest.xml`.
4. iOS: add the Associated Domains capability (`applinks:familywallet.io`) to the app target and its entitlements.
5. Test on a real phone with TestFlight and Play internal testing. Links must work with the app installed, not installed, and from Messages, WhatsApp and Mail.

## Why the native changes are not made yet

An Android intent filter or iOS associated domain without the listener would open the app but drop the link, which is worse than opening the website. They are added together, once, with the listener.

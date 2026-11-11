<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Subscription provisioning must explicitly persist the verified checkout environment for family and agency purchases; the billing portal uses that stored value to avoid crossing Stripe accounts.
- Send app email only through the linked Resend gateway connection; its project credential is a connector key, not a direct Resend API key.

- Premium partner perks and seasonal playbooks are agency-managed records; wallet reads always require the existing link-and-code session so private offers remain private.
- All unlocked family-wallet routes render inside one shared responsive navigation shell so desktop, mobile, parent, and nanny navigation stay consistent.
- Household manual entries are family-session scoped and family-managed; nanny sessions can read them, while sensitive values use a separate no-store reveal request and never enter list responses or persisted browser caches.
- Every new wallet feature reads data through the shared link-and-code session (requireFamily / requireSharedFamily), splits into lib/<feature>.{functions,types}.ts plus a .server.ts helper, and gets a /<feature>/$slug page inside the shared navigation shell; demo sample rows are seeded in drizzle migrations.
- The vault is manifest-only installable (public/manifest.webmanifest + icons): keep installability by manifest/theme-color/apple-touch-icon head tags in `src/routes/__root.tsx`; never add an app-shell service worker or cache-busting. The native iOS/Android apps are a Capacitor shell (`capacitor.config.ts`, `ios/`, `android/`) that loads the live site, so keep web-only code free of native plugin imports. The one exception is `public/sw.js`, which only handles push and notification clicks (no fetch handler, no caching) and is registered only when someone turns alerts on at /notifications/$slug.
- Notifications: server actions that change shared data call `notifyOther(family, "<route prefix>", "<generic summary>")` from `lib/notifications.server.ts` (never throws). It writes `wallet_activity`, which drives the nav badges (`wallet_seen` holds each role's last look per page) and, for features in `PUSH_FEATURES`, an empty VAPID push; the service worker then fetches `/api/push/latest` for the text. Summaries must stay generic (no names or message text) because they appear on lock screens.
- First-48-hours onboarding extends the existing welcome route; confirmations and notes are per nanny and server-derived role, and completion requires both parties so one person cannot confirm on behalf of the other.
- Partner agencies are isolated in server functions: every agency-admin function calls requireStaff/assertFamilyInScope from `src/lib/staff.scope.ts` (owner = admin role sees all; partner staff only families with their `partner_agency_id`); agency management is owner-only — because all admin reads use the service client, so RLS alone does not separate tenants.
- Challenges, perks and playbooks carry `agency_id` (null = owner content): all active partners use the same management panels through requireContentScope/assertContentRow and wallets read via walletContentAgency; legacy allow_* flags never gate access, so partners have full controls without weakening agency isolation.
- Agency logins (owner and partner staff) require authenticator-app two-step: staff.scope assertTwoStep checks the aal2 claim server-side and admin routes redirect aal1 sessions to /auth — so a stolen password alone cannot open agency data.

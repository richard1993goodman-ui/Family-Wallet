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

- Premium partner perks and seasonal playbooks are agency-managed records; wallet reads always require the existing link-and-code session so private offers remain private.
- All unlocked family-wallet routes render inside one shared responsive navigation shell so desktop, mobile, parent, and nanny navigation stay consistent.
- Every new wallet feature reads data through the shared link-and-code session (requireFamily / requireSharedFamily), splits into lib/<feature>.{functions,types}.ts plus a .server.ts helper, and gets a /<feature>/$slug page inside the shared navigation shell; demo sample rows are seeded in drizzle migrations.
- The vault is manifest-only installable (public/manifest.webmanifest + icons, no service worker): keep installability by manifest/theme-color/apple-touch-icon head tags in `src/routes/__root.tsx`; never add an app-shell service worker, cache-busting, or store-wrapper plugins.
- First-48-hours onboarding extends the existing welcome route; confirmations and notes are per nanny and server-derived role, and completion requires both parties so one person cannot confirm on behalf of the other.
- Partner agencies are isolated in server functions: every agency-admin function calls requireStaff/assertFamilyInScope from `src/lib/staff.scope.ts` (owner = admin role sees all; partner staff only families with their `partner_agency_id`); agency management is owner-only — because all admin reads use the service client, so RLS alone does not separate tenants.
- Challenges, perks and playbooks carry `agency_id` (null = owner content): all active partners use the same management panels through requireContentScope/assertContentRow and wallets read via walletContentAgency; legacy allow_* flags never gate access, so partners have full controls without weakening agency isolation.
- Agency logins (owner and partner staff) require authenticator-app two-step: staff.scope assertTwoStep checks the aal2 claim server-side and admin routes redirect aal1 sessions to /auth — so a stolen password alone cannot open agency data.

# Family Wallet: Phase 1 audit and Phase 2 architecture proposal

Prepared 11 Nov 2026. Read-only. Method: read the repo at `7a2823a` (migrations in `drizzle/` and `supabase/`, `src/lib/*.server.ts`, routes, Capacitor config, tests) and the earlier `backend-audit.md`. **Not done:** nothing was run against the live Supabase database, Stripe, Lovable or either app store, so the live schema, live prices and live policies may differ from the migrations. Items marked *(unverified)* need a live check. All effort figures are estimates.

## 1. Executive summary

- The product is a working, feature-rich wallet (about 55 tables, 43 test files, Stripe billing, push, Capacitor iOS/Android shell) but its **identity model is "shared link + access code", not user accounts**. Parents and nannies have no login of their own; only platform admins and agency staff use Supabase Auth.
- That single fact drives most gaps against your brief: no one nanny identity across households, no per-person revoke or audit, no database-enforced isolation (every read goes through the service-role key, guarded by hand-written code checks).
- The **agency privacy boundary is largely right in code** (agencies see seat status only, never wallet data) and agency seats, entitlement states and the 7-day transition already exist. They are enforced in application code, not by RLS.
- **The agency onboarding built last session (generate link and code, copy and share) is the opposite of the brief's Phase 7**: the brief wants a one-time invite the family redeems to create its own login, and says the code "is not a permanent password". Today the agency briefly sees the family's permanent credentials. This needs your decision.
- Pricing in code differs from the brief's proposals (see section 8). Internationalisation is essentially absent (GBP and en-GB hard-coded; UK-only agreement text).
- Recommendation: do not rebuild. Add a real account layer **underneath** the existing code-based access, move gradually, and ship security tests first.

## 2. Existing-platform audit

**Stack.** TanStack Start (React 19, server functions), Tailwind v4, Supabase (Postgres, Storage, Auth), Stripe via Lovable's gateway, Resend email via Lovable connector, web push (VAPID), Capacitor 8 shell. Two git remotes: public `origin` and private `lovable`. One `main` branch plus stale redesign branches. No CI workflows found in the repo *(unverified: Lovable may run its own)*.

**Database.** About 55 tables across 55 drizzle migrations plus 13 newer Supabase migrations. RLS is enabled on every table. Policies are almost all "platform admin only"; no policy is keyed to an agency, parent or nanny. Normal access is the service key.

**Auth and accounts.**

| Actor | How they get in | Own account? |
|---|---|---|
| Platform owner | Supabase Auth, `user_roles` admin, aal2 two-step | Yes |
| Agency staff | Supabase Auth, `partner_agency_staff`, aal2 two-step | Yes |
| Parent | `/w/<slug>` + 6-char code, hashed `sha256(slug:code:pepper)`, encrypted session cookie, 8 failures per 15 min | **No** |
| Nanny / staff | `/nanny/<slug>` + per-person code (`family_nannies.nanny_code_hash`) | **No** |

Hashing is a fast hash with a global pepper; acceptable for 6-char codes only because of rate limiting, weak against an offline database leak (31^6 is about 887 million combinations).

**Household and staff.** `families` (one row per household) and `family_nannies` (many staff per household, roles: nanny, au pair, housekeeper and so on). A household can already hold several staff. Self-serve limits in code: Family 2 staff, Household 6; agency-added households unlimited.

**Agencies.** `partner_agencies`, `partner_agency_staff`, `agency_invites` (seat ledger: slot, status, `family_id`), `families.partner_agency_id`. Seat statuses: pending, accepted, revoked, released. Entitlement states on families: `agency_active`, `transition` (7-day grace, `TRANSITION_GRACE_DAYS`), `direct_active`, `suspended`. Enforced centrally in `fundingOpen()`.

**Storage.** One private bucket `family-docs` with admin-only storage policies; files served by 300-second signed URLs minted server-side after a code-session check.

**Agreements.** Builder with duties, working days, rota, self-employed variant, optional AI drafting, signature table (`document_signatures`). UK-only: the AI prompt hard-codes the Employment Rights Act 1996 s1 written statement. No template library, versioning, legal-review metadata, or e-signature provider.

**Billing.** Stripe subscriptions via lookup keys `fw_<plan>_<interval>`, webhook `applySubscription`, billing portal, test/live banner. Plans in code: Family £9.99/£99, Household £19.99/£199, agency £79/£199/£349 per month for 10/50/100 seats.

**Notifications.** In-app notifications, web push, Resend email. No preference centre; no delivery-failure retry found.

**Mobile.** Capacitor shell that loads `https://familywallet.io` (remote-URL mode), offline fallback only. No deep links, no native push plugin, no secure-storage plugin installed. Store links are placeholders (`app-links.ts`).

**Quality.** 43 test files, 239 tests, including owner-scope and agency content-access tests. No automated database-level RLS tests (policies barely used). No backup/restore evidence in the repo *(unverified: Supabase plan and PITR setting unknown)*.

### 2.1 Findings, in your requested categories

1. **Works and must be preserved:** code-based wallet access (families already use it), seat ledger and entitlement states, agency isolation in code, document vault and signed URLs, agreement builder and signing, timesheets and shift sessions, Today feed, medicine safe-dose, push, demo overlays, billing webhook.
2. **Works but needs modification:** agency onboarding (see section 1), `nanny_code` as the staff identity, agreement builder (jurisdiction), money columns (check types), `fundingOpen` entitlement logic (single field, no history).
3. **Incomplete:** per-person accounts, audit log, sponsored-to-direct transition UI, notification preferences, data export and account deletion, status of the 13 newer migrations *(unverified)*.
4. **Needs building:** account layer, multi-household nanny identity, agency analytics, invitation redemption flow, universal links, localisation, template governance, support-access workflow, backup drills.
5. **Duplicated or complicated:** two agency plan tables (`billing.config.ts` and `agency-plans.ts`, with different naming and extra-household pricing in only one); two migration systems (drizzle and supabase); legacy and new seat invites coexist.
6. **Security and privacy weaknesses:** see section 6.
7. **International limits:** about 30 files contain a literal £, 69 references to `en-GB`, `lang="en-GB"` in the root, no i18n library, UK-specific legal text in AI prompts and templates, staff roles and labels hard-coded in English.
8. **Technical debt:** hand-edited `types.ts`; tolerant "column may not exist" fallbacks in server code (hides schema drift); remote-URL Capacitor shell depends on web availability; 7,000+ lines of server code relying on manual guards.

## 3. Features to preserve (do not rebuild)

Wallet access flow, family and nanny dashboards, Today timeline and feed, timesheets and shift change approval, holiday and overtime, petty cash, medicine tracking, document vault, agreement builder and signing, pairing PINs, avatars and presence, push and email notifications, billing and webhook, agency seat board, entitlement transition, house manual, demo overlays, store pills and mobile shell, all marketing pages.

## 4. Gaps against the specification

| Brief item | Status |
|---|---|
| One household = one subscription = unlimited staff | Partial: staff caps exist on self-serve plans (2 and 6). Needs commercial decision. |
| Individual staff logins | Partial: per-person codes, not accounts. |
| One identity across households | Missing. |
| Staff leaving, history retained | Partial: staff status field; no formal revoke workflow or archive guarantees *(unverified)*. |
| Agency portal | Mostly present (seats, branding, billing, terms). Analytics thin. |
| Agency privacy by RLS and tests | Partial: code guards and tests; no RLS. |
| One-time invites, hashed token, manual code, 48h expiry | Partial: the legacy email invite has a hashed token and expiry (`INVITE_DAYS`); the new generate-and-copy flow does not match. |
| Central entitlement | Partial: single field plus transition; no event history. |
| App-store payment review | Not done. |
| Deep links | Missing. |
| Localisation, currency, timezone | Missing. |
| Jurisdictional template library | Missing. |
| Export, deletion, retention | Missing *(unverified)*. |
| Admin dashboard and support access controls | Partial; no logged exceptional-access workflow. |
| Backups and restore tested | Unknown. |
| Seven test personas and critical security suite | Partial. |

## 5. Database and account architecture proposal

Principle: **add, do not replace.** Existing `families`, `family_nannies` and code access keep working throughout.

New and changed entities:

- `people` (one per human, linked to `auth.users.id`; global identity; email or phone, preferred language, time zone).
- `household_members` (person, family, role: owner, co-parent, staff; status: invited, active, revoked, ended; permissions jsonb; start and end dates). A nanny working for three families has one `people` row and three memberships. Existing `family_nannies` rows are linked to a membership, not deleted.
- `invitations` (kind: agency_sponsor, family_to_staff; agency_id, seat_id, token_hash, short_code_hash, expires_at defaulting to 48h from a platform setting, status: available, pending, redeemed, expired, revoked; redeemed_by, redeemed_at). One redemption transaction creates the account, links the household and applies the entitlement.
- `entitlements` (household_id, source: athletemannies_membership | agency_sponsored | direct_stripe | apple_iap | google_iap, state, period, external_ref) plus `entitlement_events` (append-only history). The current `families.entitlement` becomes a derived value.
- `audit_log` (actor, role, action, target, reason, ip, timestamp), append-only, written by server functions and a Postgres trigger on sensitive tables.
- `agency_id` denormalised onto family-owned tables, with RLS keyed to `auth.uid()` through `household_members` (people), and agency policies that expose **only** a narrow `agency_family_status` view (name or reference, invite status, activation date, entitlement state).
- Localisation: `countries`, `jurisdictions`, ISO 4217 currency on money columns stored as integer minor units, time zone per household and person, `agreement_templates` and `agreement_template_versions` (jurisdiction, version, legal status, reviewer, review date, approved_at, changelog), and `agreements` pointing at an immutable template version.

Authorisation model: Postgres RLS is the enforcement layer; server functions stop using the service key for ordinary reads and use the user's JWT; the service key is kept to a short reviewed list (webhooks, cron, invite redemption).

Migration sequence (each step reversible): (1) create new tables empty; (2) backfill `people` and `household_members` from existing nanny and parent records without changing access; (3) dual-run, where code login and accounts both resolve to the same membership; (4) invite existing users to claim accounts (optional, never forced); (5) retire code login only after adoption and approval.

## 6. Security and privacy risk assessment

| # | Risk | Severity | Evidence |
|---|---|---|---|
| 1 | No database-enforced isolation; one missed guard leaks across tenants | High | Service key used in 36 files, guards in 30 (backend-audit.md); RLS is admin-only |
| 2 | Platform owner can read owner-agency families; scope code is the only brake | Medium | `staff.scope.ts` comments; storage policy is admin-all |
| 3 | Fast hash of 6-char codes; global pepper | Medium | `hashCode` in `wallet.server.ts` |
| 4 | Agency sees the family's permanent credentials on generation | Medium | `generateSeatLogin` returns link and code (last session's change) |
| 5 | No audit log for staff or support reads | High | No audit table in schema |
| 6 | Bank details and house codes not field-encrypted *(unverified)* | Medium | `nanny_bank_details`, `house_manual_entries` |
| 7 | Children's data and agreement text sent to an AI provider | Medium | `agreement.ai.server.ts` |
| 8 | Public `staff-setup` endpoint sends invites and resets; enumeration unchecked | Medium | backend-audit.md |
| 9 | Remote-URL native shell: store review risk and no secure native storage | Medium | `capacitor.config.ts` |
| 10 | Schema drift hidden by fallback queries | Low | `presence.server.ts`, `seat-invites.server.ts` |
| 11 | Backups and restore untested *(unverified)* | High until confirmed | no evidence |

Children's information, identity documents, background checks and bank details are sensitive; a DPIA, retention schedule and processor agreements (Supabase, Stripe, Resend, AI provider) are needed before agency pilots.

## 7. Recommended staged roadmap

| Stage | Scope | Gate |
|---|---|---|
| A Audit and decisions | This report, live database and Stripe read-only audit, your decisions | Your approval |
| B Security foundation | Staging environment, backup and restore drill, audit log, cross-tenant test suite, secrets review | Tests green |
| C Account layer | `people`, `household_members`, dual-run, RLS policies for the new tables, enforcement moved off the service key table by table | No regression in existing logins |
| D Agency invites | One-time invite redemption replaces generate-and-copy, entitlements table, agency view, 48h expiry | Agency isolation tests |
| E Family and staff | Multi-household nanny, staff revoke with history retained, export | Persona tests |
| F Agreements | Template library and versioning, UK review by a solicitor, e-signature provider decision | Legal sign-off |
| G Localisation | i18n framework, ISO currencies in minor units, time zones, RTL | UK stays default |
| H Mobile | Native bundle (not remote URL), universal links, native push, store payment-policy review | TestFlight and Play internal |
| I Pilot and launch | One or two agencies, then controlled expansion | Explicit launch approval |

## 8. Decisions requiring your approval

1. **DECIDED 11 Nov: one-time invites.** Agency onboarding moves to brief-compliant one-time invites (family creates its own login) or keep generate-and-copy for the pilot? (You asked for generate-and-copy on 11 Nov; the brief says otherwise.)
2. **DECIDED 11 Nov: live prices stand (£79/£199/£349); the brief's proposed prices are ignored.** Original question: code has £79/£199/£349 with extra-household fees; the brief proposes £39/£119/£199. Which is live and which stands? No price changes without your say-so.
3. **DECIDED 11 Nov: unlimited staff for independent families.** **Plan: one independent-family plan at £19.99/month, unlimited staff, or paid annually upfront (annual price to confirm; current Household annual is £199).** The £9.99 Family tier is retired for new sign-ups (existing subscribers not touched without approval). Original question: the brief says unlimited staff per household; code caps Family at 2 and Household at 6. Keep tiers or go unlimited?
4. **DECIDED 11 Nov: existing AthleteMannies members keep their current login route (link plus code) unchanged.** Wallet access is free while the AthleteMannies membership is active. On cancellation the owner locks the account and deletes records (decision recorded; see risk note: needs notice, export and legal-retention check before building). Original question: confirm how membership maps to entitlement and the exact no-double-charge rule.
5. **App-store route:** free companion with web-paid plus agency sponsorship, or in-app purchase for direct families? Needs a policy review before any decision.
6. **Account migration:** invite-to-claim (recommended) versus forced cut-over.
7. **Own agency:** does AthleteMannies run as a normal agency under the same limits?
8. **Support access:** who may open a family record, and the approval and logging rule.
9. **AI drafting:** keep, or limit to non-identifying data.
10. **Legal:** who reviews the UK templates, and which second market comes first.
11. **Native approach:** continue Capacitor (recommended, with a bundled build) versus a separate native or Flutter app.

## 9. Complexity and effort (estimates only, one experienced developer working with Claude)

| Stage | Complexity | Estimated effort |
|---|---|---|
| B Security foundation | Medium | 2 to 3 weeks |
| C Account layer and RLS | High | 5 to 8 weeks |
| D Agency invites and entitlements | Medium-high | 3 to 4 weeks |
| E Multi-household and staff lifecycle | Medium | 3 to 4 weeks |
| F Agreement library (excluding legal review time) | High | 4 to 6 weeks |
| G Localisation foundation | Medium | 3 to 5 weeks |
| H Mobile release | Medium-high | 4 to 6 weeks |
| I Pilot and fixes | Medium | 4 weeks |

Total roughly 6 to 9 months part-time, or 3 to 5 months full-time, assuming decisions arrive on time. External dependencies: solicitor review, app store review, Stripe and Apple/Google policy outcomes, DPIA.

## 10. Immediate next steps

1. You answer decisions 1 to 4 (they unblock everything).
2. Read-only live audit: confirm applied migrations (13 newer ones are listed as pending in earlier notes), live RLS and storage policies, Stripe prices, Supabase backup and PITR settings, `bun.lock` reconciliation.
3. Create a staging Supabase project and run a restore drill.
4. Write the cross-tenant test suite (agency A/B, parent, nanny, owner, anonymous) before touching permissions.
5. Return with the Phase 2 diagrams (ER, auth, data flow) for the stages you approve first.

Nothing in this document has been implemented.

## Decision log addendum (11 Nov)

- Annual price confirmed at £199. **Stripe updated (live):** Household now £19.99/month (price_1UabxHPLmJpOnK3s1tBEQ2LX) and £199/year (price_1UabxJPLmJpOnK3s2vleuKhZ), lookup keys fw_household_month/year moved to them. Old £14.99 and £149 prices archived (no subscribers). Family £7.99/£79 prices untouched: one live subscriber remains on fw_family_month.
- **Wallet lifecycle rule, all wallets including partner-agency wallets:** on cancellation or release, lock immediately, 30-day export window, then delete. Reminder emails before deletion. Not yet built; legal-retention wording for terms to be reviewed.

## Stage B progress (11 Nov): live read-only audit

Read-only SELECTs against the live Supabase project (counts and policy metadata only; no personal data read, nothing written).

| Check | Live result |
|---|---|
| Tables, RLS on | 56 tables, RLS on for all 56 |
| Public-schema policies | 5 in total (admin-only on agency, perks and playbook tables; users read own role). Family tables have **no** policies, so nobody can read them through the database API. Better than the earlier audit assumed |
| Storage | One private bucket `family-docs`, one policy (admin only); no public buckets |
| Data volume | 43 families (2 agency-run), 3 agencies, 46 staff rows, 1 subscription |
| **Newer migrations** | **Not applied.** `agency_invites`, `wallet_pair_pins`, `wallet_documents`, `shift_sessions`, `moment_reactions` do not exist, and `families.entitlement` / `transition_ends_at` / `parent_photo_path` are missing. Agency seat features and the newer wallet features will fail live until applied |
| **Plain-text codes** | **All 43 families have their access code stored in plain text** (`families.access_code`), as do 15 staff (`family_nannies.nanny_code`), alongside the hashes. Anyone with database or backup access can read them |
| pg_cron | Not installed (so the 30-day lock and delete rule needs a scheduled job another way) |

### New high-priority finding
Plain-text access codes defeat the point of hashing them. Proposed fix: stop writing the plaintext, show a code only once at creation, and null out existing values after an announced regeneration. Needs your approval because families who rely on seeing their code in the app would need a "reset code" flow first.

### Built in this stage (committed locally, not applied to the live database)
- `supabase/migrations/20261111300000_audit_log.sql`: append-only audit table (service role only, update and delete revoked).
- `src/lib/audit.server.ts` and the first caller: generating an agency seat login is now logged (who, which agency, which family, which seat; never the code).
- `src/lib/rls-guard.test.ts`: fails the build if any migration creates a table without enabling RLS, or grants anon access.

### Plain-text access codes (implemented 11 Nov, committed locally)
Rule: a code is readable only until its owner first signs in with it, then cleared; only the hash stays. Family and staff codes are cleared on first successful sign-in. Lost codes are replaced, not revealed: the recovery email, the owner's invite email and the staff invite email issue a fresh code when none is stored. The admin screens say "code used, no longer stored" and offer "New code". **Not yet applied live:** `families.access_code` is still NOT NULL in the live database (migration `20261111320000_codes_not_kept.sql` must run before this code deploys, or clearing on sign-in fails quietly). **Then, after it deploys:** clear the readable codes of the 7 families who have already opened their wallet; the other 36 clear themselves at first sign-in. Tests: `code-retention.test.ts`.

Stage C design (draft, for review): see `stage-c-account-layer-design.md`.

Stage D design (draft, for review): see `stage-d-agency-invites-design.md`.

Stage E design (draft, for review): see `stage-e-agreements-design.md`. Stage F design (draft, for review): see `stage-f-localisation-design.md`.

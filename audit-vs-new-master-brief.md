# Family Wallet: audit against the new Master Prompt

Prepared 12 Nov 2026. **Audit and plan only. Nothing has been changed, deployed or run against the live database.**
Method: read the repo at `4abd30c`, the 11 Nov audit (`platform-audit-and-architecture.md`), `backend-audit.md`, the stage design notes, `wallet-nav.ts` and the route list. Items marked *(unverified)* need a live check.

## 0. Read this first

The new brief overlaps a lot with work already decided on 11 Nov. Four places **conflict** with those decisions, and I will not pick a side silently:

| # | New brief says | Already decided / built | Needs your call |
|---|---|---|---|
| 1 | Sign in with Apple, Google or email; no unexplained invitation code | Existing members keep link + code (decision 4). Magic-link account layer exists (Stage C). | Keep link + code for existing families, add Apple/Google/email for new ones? (Apple requires Sign in with Apple if Google is offered.) |
| 2 | Never delete data just because a subscription ends | Decision 11 Nov: lock, 30-day export, then delete (scheduler now live; purge off) | Keep the 30-day rule, or switch to retain-and-lock? Legal retention not yet reviewed. |
| 3 | Remove "Plan and Billing" from main navigation | Billing is the only place a family manages Stripe (portal) | Fine to move into More > Subscription; purchase restore needed for the app stores. |
| 4 | Remove Active Kid Passport, First 48 Hours, Employment Cost, Agency Challenge | All still exist as routes/code | Confirm removal from the interface only (no backend or data deletion). |

**Decided 12 Nov ("Recommended defaults"):**
1. Add Apple / Google / email sign-in for new families; existing families keep link + code unchanged.
2. Keep the 30-day export-then-delete rule (purge stays off; legal retention wording still to be reviewed by the owner or their solicitor).
3. Plan & Billing moves to More > Subscription, with purchase restore added before store release.
4. Employment Cost, Agency Challenge, Kid Passport and First 48 Hours are removed from the interface only; tables, records and server code stay, and old routes redirect.

## 1. What is already working well
- Wallet access by link + code is live and families use it. Seat ledger, entitlement states (agency / transition / direct / suspended) and agency isolation (agencies see seat status only) exist and are tested.
- Document vault with 5-minute signed URLs; agreement builder and signing; timesheets, shift change approval, petty cash, medication, incidents, Today feed, push, Stripe billing, audit log started, 30-day lifecycle scheduler working end to end.
- i18n catalogue (en-GB base), iOS/Android Capacitor shell, TestFlight build uploaded, universal-link plumbing for iOS.
- Live database (11 Nov read-only check): RLS on all 56 tables; family tables have no public policies, so they cannot be read through the database API.

## 2. What is poorly structured
- **Navigation:** about 40 destinations in four sections (Overview, Day to day, Family & home, Household staff), plus a desktop sidebar, a section tab bar, a command palette, an accordion and a 4-tab mobile bar. Several competing systems, the exact problem the brief describes.
- **Page-per-feature routing:** ~50 `/<feature>/$slug` routes, each its own page layout.
- Two agency plan tables, two migration systems (drizzle + supabase), legacy and new seat invites side by side.
- Server code reads with the service key and relies on hand-written guards (36 files use the key, 30 have guards) *(from 11 Nov audit)*.

## 3. Retain
Wallet access flow, Today timeline, timesheets and shift approvals, leave, petty cash, bank details, document vault, agreements and signing, medication, incidents, handover, house manual, emergency page, kids profiles, messages, notifications and push, agency seats and branding, export, lifecycle, billing webhook, demo overlays.

## 4. Consolidate
| New tab | Folds in (existing routes) |
|---|---|
| Home | `w`, `today`, `log`, `moments`, `handover`, `report`, emergency pill, next-step cards |
| Calendar | `planner`, `hours`, `timesheets`, `leave`, `livein` |
| People | `family`, `kids`, `nannies`, `nanny`, `pair`, `permissions` (as a section), `mylogin` |
| Wallet | `documents`, `agreement`, `training`, `safety`, `payroll`, `bankdetails`, `pettycash`, `export` |
| More | account, security, notifications, subscription (`billing`), support, `terms` |

Messages, incidents, medication and house manual become sections or actions inside Home and People, not tabs.

## 5. Remove from the interface only
Employment Cost (`costs`, `employment-cost.model.ts`), Agency Challenge (`ChallengesPanel`, `challenges.*`), Active Kid Passport (`passport`), First 48 Hours (`First48Checklist`), Actions to Complete (`SetupStatus`/`NextStep` as a standalone feature; keep useful prompts in context), Permission & Consent as a nav destination (keep the data and consents), Plan & Billing out of primary nav, Help & Support to the bottom of More. Keep tables, records and server code; hide routes behind redirects first.

## 6. Needs rebuilding
- Navigation shell (one system, 5 tabs, same IA on desktop).
- Home as a true chronological daily timeline with an Emergency pill.
- Guided family onboarding (family, children, emergency, add staff) with save-and-resume.
- Entry: add Apple/Google/email identity for new families (existing code login stays).
- Entitlement history table (today: a single field).
- Native build that bundles the app instead of loading the remote site (store review risk).

## 7. Database and permission changes
Reuse the 11 Nov proposal: `people`, `household_members` (roles, permissions, status, dates), `invitations` (hashed token, 48h expiry default, one-time), `entitlements` + `entitlement_events`, extend `audit_log`, `countries`/`jurisdictions`/template versions, money as integer minor units with ISO 4217. Add, never replace: existing `families`, `family_nannies` and code access keep working through a dual-run period. RLS becomes the enforcement layer table by table.

## 8. Most important security risks
1. No database-enforced household isolation; one missed guard leaks across households (High).
2. Audit log covers only one action so far; support/owner reads are not logged (High).
3. 11 Nov: plain-text access codes stored; fix written, **live migration not applied** *(re-verify)* (High).
4. 11 Nov: newer migrations not applied live; agency/seat features fail until applied *(re-verify)*.
5. Backup and restore untested *(unverified)* (High until confirmed).
6. Fast hash + global pepper for 6-char codes (Medium).
7. Children's data and agreement text sent to an AI provider (Medium); bank details not field-encrypted *(unverified)*.
8. Remote-URL native shell: no secure storage; Face ID unlock not built.

## 9. New onboarding journey (proposed)
1. Open app, choose Apple / Google / email (or "I have a link or code" for existing and invited users).
2. Entitlement check: existing wallet, agency-sponsored invite, or direct subscription (web-paid unless store policy review says otherwise).
3. Family profile (name, parents, address, contact), then emergency contacts, then children (allergies, school, collection). Progress bar; every optional field skippable; saved and resumable.
4. Prompt: "Your family profile is ready. Now add your nanny, au pair, babysitter or other household staff." Skippable; invite by secure one-time link.
5. Land on Home with helpful prompts, never an empty admin dashboard.

## 10. Navigation and Home
- **Bottom bar (mobile) / left rail (desktop, same five items):** Home, Calendar, People, Wallet, More.
- **Home:** greeting and a contrasting **Emergency** pill at the top (contacts, allergies, medical, care instructions, permission-controlled). Then "Today" as a time-ordered list (arrivals, school runs, activities, finish) with staff updates, notes and photos inline; "Next up"; quick actions through one add button. Staff see their own working day; parents see what has happened and what is next.

## 11. Safest implementation order
1. **B Security foundation:** confirm/apply pending migrations (with your approval), backup/restore drill, staging project, cross-household test suite, audit-log coverage.
2. **UX shell (new):** hide removed features behind redirects, one navigation system, Home timeline, design tokens. No data changes.
3. **C Account layer + Apple/Google/email**, dual-run, RLS table by table.
4. **D** agency one-time invites + entitlements; **E** multi-household staff; **F** agreements and legal review; **G** localisation; **H** native bundle, Face ID, push, store payments review; **I** pilot.

## 12. What could break existing families
- Removing routes: old bookmarks and emailed links. Mitigation: redirects, keep routes alive for a release.
- Moving tabs: staff muscle memory; mitigate with a one-time "what's new" note.
- Account-layer migration: any change to code login or session cookies can lock families out. Mitigation: dual-run, invite-to-claim, never forced.
- Applying pending migrations or clearing plain-text codes while code still expects them.
- Lifecycle purge (off today); turning it on without notice and export checks would delete real data.
- Capacitor bundling changes can break universal links and push if the app id or entitlements shift.

## 13. Essential vs optional
**Essential:** security foundation, one navigation, Home timeline + Emergency, onboarding, account layer, entitlements, agency one-time invites, export/retention, backups, test suites.
**Optional/later:** jurisdiction template library beyond UK, RTL and extra languages, API access, Apple/Google in-app purchase (pending policy review), advanced agency analytics, offline mode.

## 14. Approvals needed before any build
1. Conflicts 1 to 4 in section 0.
2. Go-ahead for a read-only live re-check (migrations applied? plain-text codes? backups?).
3. Confirm the five-tab structure, or edit it.
4. Whether to start with the UX shell (recommended, no data changes) or the security foundation first.

Nothing here is implemented or deployed.

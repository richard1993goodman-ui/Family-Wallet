# Family Wallet: backend audit (read-only)

Prepared 9 Nov 2026. Method: parsed all 44 drizzle and 2 supabase migrations, and scanned `src/` for service-key use and scope checks. Nothing was run against the live database, so the live schema may differ from the migrations. No code was changed.

## Summary

Default-deny is in place at the database, but every real read and write goes through the service key, so tenant isolation rests on 30 hand-written code checks. The platform owner can read every agency's families, both through the app and directly in the database.

## 1. Tables (50)

| Item | Result |
|---|---|
| Row-level security (RLS) enabled | 50 of 50 |
| Tables with at least one policy | 37 |
| Tables with RLS on and no policy (deny all) | 13 |
| Policies that allow anyone except platform admin | 1 (`user_roles`: a user reads their own role) |
| Policies keyed to an agency, parent or nanny | 0 |
| Family-owned tables with `family_id` | 41 |
| Tables carrying `agency_id` | 2 (`partner_agency_staff`, `agency_terms`) |
| Agency link on a family | `families.partner_agency_id` only |

All 37 policies read `has_role(auth.uid(), 'admin')`. So a logged-in platform admin can read and write every family table straight through the database API, with no app code in the way.

No-policy tables (deny all, only reachable by service key): `wallet_access_attempts`, `saved_resources`, `timesheet_shifts`, `agency_challenges`, `challenge_recipients`, `challenge_completions`, `agency_terms`, `house_manual_entries`, `kids_playbook_entries`, `nanny_bank_details`, `incident_reports`, `household_permissions`, `family_subscriptions`.

## 2. Service-key use

- 36 files use `supabaseAdmin`; 30 files call a guard (`requireStaff`, `assertFamilyInScope`, `requireFamily`, `requireSharedFamily`, `requireOwner`, `requireContentScope`).
- 8 files use the key with no guard of their own: `client.server.ts`, `wallet.server.ts`, `agreement.server.ts`, `agreement.ai.server.ts`, `agency-terms.server.ts`, `work-tools.server.ts`, `billing.server.ts`, `staff-setup.functions.ts`. Most are helpers called by guarded functions, but each caller must be traced to confirm. That trace is not done.
- `staff-setup.functions.ts` is a public endpoint that sends sign-in invites and password-reset emails. Not yet checked for email enumeration or abuse.
- A new function that forgets its guard leaks across agencies. Nothing but review catches it.

## 3. Owner visibility

- `resolveStaffScope` returns `{kind: "owner"}` for the admin role. `assertFamilyInScope`, `assertRowInScope`, `assertPathInScope`, `canSeeFamily` and `requireContentScope` all return early for it. That is 9 places in `staff.scope.ts`, `agency-terms.functions.ts` and `admin.functions.ts`.
- Storage files follow the same rule: the owner can open any family's file.
- This is the part that conflicts with your confidentiality requirement.

## 4. Family and nanny access

- Access is a shared link plus access code (hashed with a pepper, sha256) stored in an encrypted session cookie; `wallet_access_attempts` provides rate limiting.
- Codes are hashed per family, not per person. No per-person account, audit trail, or way to revoke one person.
- Nanny sessions add a nanny-level key on top of the family unlock.

## 5. Other items

- Agreements are built on the server and use an AI provider (`agreement.ai.server.ts`). Family and nanny details leave your system. Check the provider's data terms and say so in the privacy policy.
- Staff two-step (aal2) is enforced server-side. Good.
- No audit log table exists.
- No encrypted columns found for bank details or house codes (`nanny_bank_details`, `house_manual_entries`). Check whether reveal is only a UI gate.

## 6. Recommended order of work

1. **Split the owner role.** Create a platform-admin role with no family access. Remove the 9 owner shortcuts. Replace the 37 admin-only policies so that no platform account can read family rows.
2. **Add `agency_id` to every family-owned table.** Backfill from `families.partner_agency_id`, set NOT NULL, index it.
3. **Write real RLS policies** for agency staff, parents and nannies, using the user's own session. Cut service-key use down to a short, reviewed list.
4. **Per-person accounts** for parents and nannies; keep the code as the invite.
5. **Audit log** for every staff read or change of family data.
6. **Field encryption** for bank details and house codes.
7. **Cross-tenant tests**: agency A, agency B, parent, nanny, platform admin, run against every table.

Steps 1 and 7 should ship first and together.

## 7. Open questions for you

- Do you also run your own agency on the platform? If so, it becomes a normal agency with the same limits as any partner.
- Who handles support when a family has a problem: the agency, or you through a logged, approved access request?
- Has a data processing agreement been signed with each partner agency, and with Supabase and the AI provider?

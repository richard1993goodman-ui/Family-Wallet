# Stage C design: the account layer (draft for review, nothing built)

Prepared 11 Nov 2026. Builds on `platform-audit-and-architecture.md`. Decisions already made: existing AthleteMannies members and existing families keep the link-and-code login unchanged; independent families get unlimited staff; agency onboarding moves to one-time invites (Stage D); wallets lock then export then delete.

## 1. What is true today (from the code and the live database)

- A **session is a cookie** (`family-wallet`, encrypted) holding a list of unlocked keys: `<slug>` for a parent, `nanny:<slug>:<id>` for one staff member. `sessionAccess(slug)` turns that into `{level: "family" | "nanny", nannyId}`.
- **Staff have no contact details at all.** `family_nannies` has no email or phone column. Live: 43 active staff rows. Only 4 people in the whole project have a Supabase login (owner and agency staff).
- 42 of 43 families have a contact email.
- Every server function checks access in code through `sessionAccess` and then uses the service key. Row-level security does no work for families or staff.
- Rate limits and hashes: per-family and per-staff code hashes, 8 failures per 15 minutes.

Consequence: an account layer cannot start by asking everyone to sign up. It has to be **optional, additive, and claimed from inside an existing session.**

## 2. Principles

1. Existing code login keeps working, for ever if people want it. Nobody is forced to migrate.
2. One global identity per human (`people`), many memberships (`household_members`). A nanny with three families is one person with three memberships.
3. Access is decided in **one function** (`resolveAccess(slug)`) that accepts either a code session or an account session. Everything else keeps calling it. That makes the dual-run safe and testable.
4. Row-level security moves in only after the account layer is stable, table by table, highest risk first.
5. Every step reversible: new tables only, no column drops, feature flag per step.

## 3. Proposed schema (draft SQL, not applied)

```sql
-- One row per human who has claimed an account. user_id is Supabase Auth.
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null,
  preferred_language text not null default 'en',
  time_zone text not null default 'Europe/London',
  created_at timestamptz not null default now()
);

-- A person's relationship with one household. Independent permissions per row.
create table household_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  person_id uuid references people(id) on delete restrict,        -- null until claimed
  role text not null check (role in ('owner', 'co_parent', 'staff')),
  nanny_id uuid references family_nannies(id) on delete set null,  -- links a staff member's existing records
  status text not null default 'active' check (status in ('invited', 'active', 'revoked', 'ended')),
  permissions jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  revoked_by uuid references people(id),
  unique (family_id, person_id),
  unique (nanny_id)
);

-- One-time claim tokens, created from inside an existing session. Hashed, single use, short expiry.
create table account_claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references household_members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
-- All three: RLS on. people and household_members get "own row" read policies for the signed-in user;
-- account_claims stays service-role only.
```

Seeding (backfill): one `household_members` row per active parent-holder (role `owner`) and per active `family_nannies` row (role `staff`, `nanny_id` set), with `person_id` null. This changes nothing for anyone; it just gives every existing human a place to attach an account to.

## 4. Flows

**Claim (optional, from inside a wallet).** Signed in with the code, a parent or staff member sees "Create your own login". They enter an email (or phone) and set a password or use a one-time email link. The server verifies the code session, creates the Supabase user, creates `people`, links `household_members.person_id`. No agency or other family is involved. Staff provide their own email at this moment, which solves the missing contact details.

**Sign in with an account.** Supabase Auth session. `resolveAccess(slug)` looks up the person's active membership for that slug and returns the same `{level, nannyId}` shape. All existing screens keep working.

**Many households.** After sign-in a person sees their memberships (a household switcher). A nanny who works for three families sees all three, each with its own permissions and its own agreement and timesheets.

**Staff leaves.** The household sets the membership to `revoked` or `ended`: access stops immediately, the staff member's code hash is cleared, signed agreements and timesheets stay with the household. The person's identity remains, with their other households untouched.

**Parent adds a second parent.** A membership with role `co_parent`, created from an invite the owner generates.

## 5. Access resolution during the dual-run

```
resolveAccess(slug):
  1. account session (Supabase) with an active membership for slug  -> use it
  2. else code session cookie (today's behaviour)                    -> use it
  3. else none
```

Rules: a revoked membership beats a lingering code cookie (revoke also rotates the code hash). `touchWalletSession` and the lock-and-delete lifecycle read the same function.

## 6. Row-level security plan (after the account layer works)

Order, highest risk first: `wallet_documents` and the storage bucket, `nanny_bank_details`, `house_manual_entries`, `incident_reports`, then the rest. Each table gets policies keyed to `household_members` (`person_id = my person and status = 'active'`, permission checks from `permissions`). Server functions for that table switch from the service key to the user's session. The code-session path keeps using the service key until retired, so a table is only "RLS-enforced" for account users at first. Honest consequence: **full isolation arrives only when code login is retired**, which is a later, separately approved step.

## 7. Delivery steps (estimates)

| Step | Scope | Effort |
|---|---|---|
| C1 | Tables, backfill, `resolveAccess`, tests (no user-visible change) | 1 to 1.5 weeks |
| C2 | Claim flow and account sign-in screens, in the app and mobile shell | 1.5 to 2 weeks |
| C3 | Household switcher, multi-household nanny | 1 week |
| C4 | Revoke and end-of-employment flow, audit log entries | 1 week |
| C5 | RLS for the 5 highest-risk tables, storage policies, cross-tenant tests | 2 weeks |
| C6 | Adoption nudges, retire-code-login decision | later |

## 8. Risks

- **Supabase Auth user count and email deliverability** for staff without email: offer phone one-time codes as the fallback (cost per SMS to be agreed).
- **Account takeover via the claim flow**: claim tokens are single-use, hashed, 30 minutes, rate-limited, and need an active code session.
- **Lockout**: a person who loses their password and has no code session needs recovery; parent recovery by email already exists, staff recovery goes through the parent.
- **Two sources of truth** during the dual-run: mitigated by the single `resolveAccess` function and a test that every server function goes through it.
- **Mobile shell** loads the live site, so account sessions and the cookie must both work inside the Capacitor webview (to test on a device).

## 9. Decisions needed before C1

1. **DECIDED 11 Nov: magic link first** (password optional later). Original question: email plus password, email magic link, or both?
2. **DECIDED 11 Nov: require an email at claim; no SMS.** Staff who do not want an account keep using their code. Original question: allow phone codes (SMS cost) or require an email at claim?
3. Should a parent be able to remove a staff member's account, or only end the membership (recommend: end the membership, never delete the person)?
4. Co-parents: needed at launch or later?
5. Confirm "optional account" is the right promise for existing families (no forced migration).

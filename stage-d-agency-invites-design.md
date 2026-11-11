# Stage D design: agency one-time invitations (draft for review, nothing built)

Prepared 11 Nov 2026. Decided earlier: agency onboarding moves to **one-time invites** that the family redeems; the agency never sees a family's access code. Existing agency families and the seat model stay as they are.

## 1. What already exists (so we reuse it)

The older email-invite path in `seat-invites.server.ts` already does most of Phase 7:

- A random 256-bit token, stored only as a hash (`agency_invites.token_hash`), cleared once used.
- Single use: one conditional update claims the invite, so a link cannot be redeemed twice.
- Expiry, statuses (`pending`, `accepted`, `revoked`, `released`), resend, revoke, and a seat ledger with one open invite per slot.
- The family opens `/join/<token>`, names its household, creates its own wallet, and receives its own link and code once. The agency never sees them.

The "generate login for the agency to copy" flow added on 11 Nov (`generateSeatLogin`) is the exception: it hands the agency the family's permanent credentials. That is what Stage D retires.

## 2. Gaps against the brief (Phase 7)

| Brief | Today | Stage D |
|---|---|---|
| Agency shares the invite by WhatsApp, email or anything | Only emailed by us; email required | Agency can **copy the one-time link** (and optionally have us email it). The link is an invitation, not a credential |
| Short manual code as backup | None | 8-character one-time code, hashed, redeemed at `/join` |
| Default expiry 48 hours, configurable | 14 days, fixed | 48 hours default, set by `INVITE_HOURS` |
| Rate limit and brute-force protection | None on the token or code | Attempt limits on token lookups and code entry (same pattern as wallet access attempts) |
| Family creates its own login | Gets a code only | After redeeming, offered "Create your own login" (the C2 flow); the code remains the backup |
| Verify email or mobile | Possession of the link only | The family's own login step verifies its email; the invite email address is a hint, not proof |
| Terms and privacy at activation | None | One checkbox step, recorded on the family (`terms_accepted_on` already exists) |
| Audit of create, resend, revoke, redeem | None | All four logged to `audit_log` |
| Agencies can replace expired invites | Revoke then re-invite | One "Replace" action on an expired seat |
| Nanny credentials made by the agency | Agency types a nanny name or email on the invite | Removed. The family adds its own staff from its wallet; the invite may carry an optional first name only, to pre-fill |
| Agency cannot see private data | Already true (status only) | Keep; add a test that no agency endpoint returns wallet fields or credentials |

## 3. Data changes (additive)

```sql
alter table agency_invites
  add column if not exists code_hash text,          -- sha256 of the backup code, cleared on use
  add column if not exists code_attempts int not null default 0,
  add column if not exists created_by uuid;          -- the agency staff user who made it (audit)
create unique index if not exists agency_invites_code on agency_invites (code_hash) where code_hash is not null;
```

No mobile number is stored: the agency types it into its own WhatsApp message. Less personal data kept, fewer breach consequences.

## 4. Flows

**Agency creates an invite.** Picks a free seat, types the family's name (optional email, optional intended nanny first name). Gets a link like `/join/<token>` and a backup code, both shown once, with "Copy link", "Copy code" and "Email it for me". Seat state becomes `invited` with a 48-hour expiry.

**Family redeems.** Opens the link on any device (or enters the backup code at `/join`). Sees the agency's name, confirms its household name, accepts the terms, and the wallet is created with agency funding. It then sees its own access code once and the optional "Create your own login" step. The invite is consumed and the seat becomes `occupied`.

**Expiry, revoke, replace.** Unused invites expire after 48 hours and free the seat. The agency can revoke, resend (a fresh link; the old one dies), or replace. Resending never creates a second household or a second charge, because the seat is claimed only at redemption.

**Mobile.** The same `/join/<token>` link works in a browser today. Universal Links and App Links, so the link opens the installed app, belong to Stage G. Installing the app from the link and carrying the invite across is not assumed to work until built and tested.

## 5. Security

Tokens and codes are hashed and single use; redemption is one conditional database update. Attempts are rate-limited per client and per invite, and a code locks after 5 wrong tries. An invite can only be read or acted on through its own agency (the agency id is checked on every call). Nothing in an invitation email or screen contains a wallet credential. Everything is logged.

## 6. Delivery steps (estimates)

| Step | Scope | Effort |
|---|---|---|
| D1 | Migration, new invite creation (link + code, 48h), copy and email options, tests | about 1 week |
| D2 | Redemption: terms step, code entry at `/join`, rate limits, audit entries, optional account step | about 1 week |
| D3 | Seat board changes: replace, status, retire generate-and-copy and the agency nanny fields; cross-agency tests | about 1 week |

## 7. Decisions needed

1. **48 hours** as the default (the code today uses 14 days). Confirm, or choose another.
2. **No mobile number stored.** Confirm.
3. **Keep "email it for me"** alongside copy-and-share? (Recommended: yes.)
4. **Terms wording:** who provides the family terms and privacy text shown at activation? I will not draft legal text.
5. **Retire generate-and-copy fully**, including the agency page copy that says agencies copy a login. (Recommended: yes.)
6. **Existing generate-and-copy households** (any created since 11 Nov) stay as they are, and their codes clear at first use like every other family. Confirm.

## Decisions confirmed (11 Nov)
1 to 3, 5 and 6 confirmed as recommended: 48 hours, no mobile number stored, keep "email it for me", retire generate-and-copy, existing households unchanged. **Decision 4 (terms text) is still open**: it needs wording from you or your solicitor, and the activation step in D2 will not ship a terms checkbox until it exists.

## D1 status
Built and committed locally, not applied live: migration `20261111400000_invite_backup_code.sql`, `createSeatInvite` (link plus backup code, hashed, 48h, audit), the agency "Create invitation" screen, and tests. The backup code cannot be redeemed until D2 adds code entry at `/join`, so D1 must not be released on its own. `generateSeatLogin` is still in the code and goes in D3.

## D2 status (11 Nov)
Built and committed locally, not applied live: code entry at `/join` (verify the code, name the household, create the wallet), redemption by link or code through one conditional update that also clears both hashes, rate limits (8 failures per device per 15 minutes, 100 across the service per hour), audit entries (`invite_created`, `invite_redeemed`), and a shared "wallet ready" screen. **Correction to the design:** a per-invite attempt counter was dropped, because a wrong code does not identify an invite, so limits are per device and service-wide instead (the unused column was removed from the migration). **Still open:** the terms checkbox (no text supplied yet) and "email verification" beyond the optional My login step. The full flow has not been run end to end against the live site: it needs the migration applied first.

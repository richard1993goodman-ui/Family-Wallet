# Wallet lifecycle: lock, 30-day export, then delete (design, partly built)

Prepared 11 Nov 2026. Your rule: when a wallet stops being funded or is cancelled it is **locked at once**, the household gets **30 days to export its data**, then the data is **deleted**, for every wallet including agency wallets, with reminders before deletion. Deletion is permanent, so nothing here deletes anything until you switch it on.

## 1. What I found

- **Statuses today:** `active`, `suspended`, `cancelled`. All 44 live wallets are active, so there is no backlog to handle.
- **What locks a wallet today:** a cancelled or unpaid Stripe subscription (`cancelled`), the owner or an agency marking a family cancelled, and an agency-released household whose 7-day transition ends (`suspended`).
- **Database:** almost every household table deletes with its household (cascade). Exceptions are the append-only agreement history (signatures, versions) and the payment and seat records, which are set to null instead. So deleting the household row alone would fail or leave records behind: it needs an ordered purge.
- **Files:** one private bucket, with files under `vault/<household>/` and older `<household>/...` paths (headshots, legacy documents).
- **The existing `deleteFamily` button** deletes immediately and only removes one kind of file, leaving vault documents and photos behind. It should use the new purge.
- **No scheduler yet:** the database has no cron extension. The app has an authenticated cron helper but nothing is scheduled; the daily job needs a scheduler set up outside the repo.

## 2. The design

**Lock clock (built, not applied).** A database trigger sets `locked_at` and `delete_after = locked + 30 days` whenever a status change takes a wallet from active to suspended or cancelled, from any part of the app, and clears them if it becomes active again. Moving suspended to cancelled does not restart the clock.

**Reminders (rules built and tested).** Emails on day 0 (locked, with the download link), day 14, day 25 and day 29 (final, "deleted tomorrow"). Only the latest one due is sent, never twice, and they contain no private detail or codes.

**Export (not built yet).** A page at `/export/<wallet>` that works for a locked wallet and asks for the wallet code. It downloads one file with the household's data (children, routines, logs, timesheets, agreements, messages, expenses, bank details and so on) plus a download link for each document and photo. A single zip needs a library, so the first version is one data file plus individual files.

**Deletion (rules and purge function built, not applied).** A daily job deletes a household only when **all** of these hold: still locked, the 30 days are over, no hold on it, and the final reminder was actually sent (or you have confirmed it for a household with no email address). The purge removes the files, then the database records in a safe order, blanks any personal details on payment and seat records that are kept, deletes account logins that belong to no other household, and leaves only a stub (that it existed, when it went, whether an agency funded it). A dry-run mode lists what would be deleted without deleting.

**Owner controls.** A hold switch to stop a deletion, a confirm switch for wallets with no email, and the improved "delete now" for an owner's own families.

## 3. Things your terms must say (I have not written them)

The household is the employer and may be required by law to keep some employment and payroll records for years, so deleting everything after 30 days can leave them without records they need. That is why the 30-day export window matters, and why your terms should say clearly that data is deleted, that they must export what they need, and that deletion is permanent. Please have your solicitor confirm the wording and the 30 days.

## 4. Status

| Part | State |
|---|---|
| Rules: window, reminders, deletion conditions, email wording | Built and tested |
| Migration: lock clock, hold, tombstone, purge function | Written, **not applied** |
| Export page and download | Not built |
| Daily job (send reminders, dry-run, delete) and its scheduler | Not built |
| Owner screen (locked wallets, holds, confirm) | Not built |
| Terms wording | Yours / your solicitor's |

## 5. Decisions needed

1. Confirm **reminders on days 0, 14, 25 and 29**.
2. Wallets with **no email address** (2 today, both agency wallets): hold for you to confirm one by one, or delete anyway after 30 days? (Recommended: hold.)
3. After a wallet is **reactivated** (family subscribes during the 30 days) should anything already exported be left alone? (Nothing is deleted, so yes.)
4. Who sets up the **scheduler** (Lovable scheduled task or another), and is a daily run at a fixed time fine?
5. **Dry-run for the first 2 weeks** after switching on, with you reviewing the lists, before real deletion? (Recommended: yes.)

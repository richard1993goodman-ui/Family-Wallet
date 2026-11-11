# Stage E design: agreements, templates and signing (draft for review, nothing built)

Prepared 11 Nov 2026. Built from the code (`agreement.server.ts`, `agreement.ai.server.ts`, `AgreementDocument.tsx`) and the live schema. Legal status of any wording is **not** decided here: nothing below claims a template is legally reviewed or compliant.

## 1. What exists today

- One row per household and staff member in `nanny_agreements`: legacy text columns (`hourly_rate` is **text**), a `agreement_data` JSON document, `status` (`draft` or `issued`) and an integer `version`.
- Signatures in `document_signatures`: who (typed name, role), which `doc_version` (a number), when, and a device key. Typed-name signing, no signed-copy file, no content hash.
- A UK-only builder: the AI drafting prompt hard-codes "Employment Rights Act 1996, section 1 written statement", and the builder, rota and self-employed variants assume England.
- Editing an issued agreement bumps `version` but **overwrites `agreement_data` in place**.

## 2. The serious gap

**The wording that was signed is not kept.** When an issued agreement is edited and re-issued, the old text is overwritten and only the version number changes, so version 1's signatures point at wording that no longer exists anywhere. That contradicts your brief ("preserve historical versions", "do not silently alter signed agreements") and would be a problem in any dispute. It is the first thing to fix, and it can be fixed without touching a template library.

Honest limit: versions already overwritten before this fix cannot be recovered. From the fix onward every issued version is kept.

## 3. Proposal

**E1, immutable versions (no legal content).**
`agreement_versions` (agreement id, version number, snapshot of `agreement_data`, rendered text, SHA-256 content hash, issued_at, issued_by, template reference nullable). Issuing copies a snapshot; nothing ever updates a version row (update and delete revoked, like the audit log). Signatures gain `agreement_version_id` and `content_hash`, so each signature proves what exact text it covers. Existing issued agreements are backfilled with their current text as their latest version.

**E2, template governance.**
`agreement_templates` (kind, jurisdiction code, language) and `agreement_template_versions` (version, body, status: draft, under_review, approved, superseded; reviewer name and role, review date, notes, changelog). The builder shows a clear label: "Approved on <date> by <reviewer>" only when approved, otherwise "Not yet legally reviewed". Owner-only admin screen; agencies and families never edit templates. Templates are data, so a new jurisdiction is content, not code.

**E3, signing evidence and history.**
Record signer account or code session, timestamp, IP and content hash per signature, written to the audit log too. Amendment flow: an edit to an issued agreement creates a new draft version; the household issues it and both sides sign again; the previous signed version stays visible in a history list.

**E4, documents out.**
Generate and store a signed PDF of each fully signed version in the document vault, with an agreement history and downloads.

**E5, electronic signature provider (decision).**
Typed-name signing is a simple electronic signature. Whether that is enough, or a provider is needed (and in which country), is a legal and commercial call. I will compare options and costs, not recommend a legal conclusion.

**Agencies** keep seeing nothing of agreements (unchanged and already tested).

## 4. Jurisdiction model

Add `country` and `region` to the household (shared with Stage F). A template is chosen by country and region plus arrangement (employed, self-employed, au pair, live-in) and language, never by language or currency alone. The UK (England first) is the only market with content until a local professional reviews another. The AI drafting step stays optional and is limited to non-identifying wording; it never labels anything "approved".

## 5. Delivery steps (estimates)

| Step | Scope | Effort |
|---|---|---|
| E1 | Immutable versions, signature hashes, backfill, tests | about 1 to 1.5 weeks |
| E2 | Template tables, governance labels, owner admin screen | about 1.5 to 2 weeks (plus legal review time, not mine) |
| E3 | Amendment flow, signing evidence, history | about 1.5 weeks |
| E4 | Signed PDF to the vault, history UI | about 1 to 1.5 weeks |
| E5 | Provider comparison and integration, if chosen | 1 to 3 weeks depending on the provider |

## 6. Decisions needed

1. **Start E1 now?** It needs no legal input and fixes the preserved-history problem. (Recommended: yes.)
2. **Who reviews the UK templates** (name and firm), and when? Until then every template shows as not yet reviewed.
3. **Signing standard:** is typed-name signing acceptable for the UK launch, or should a provider be added before agency pilots?
4. **Second jurisdiction and reviewer:** which country next, if any, in the first year?
5. **AI drafting:** keep it, restrict it to non-identifying text, or switch it off for now?

## E1 status (11 Nov)
Built and committed locally, not applied live: migration `20261111420000_agreement_versions.sql` (append-only `agreement_versions`, signature evidence columns, backfill of current issued wording), snapshot on every issue, and signatures that record the version and hash. **Behaviour change:** signing is refused while the wording on screen differs from what was issued (it must be re-issued first), so a signature always covers exactly the stored text. Not yet run against the live database; a rolled-back dry run of the migration is the next check.

## E2 status (11 Nov)
Built and committed locally, not applied live: migration `20261111440000_agreement_templates.sql` (template and template-version tables; a version cannot be approved without a named reviewer and date; approved versions are frozen; no wording seeded) and `agreement-review.ts`. Every agreement document now ends with "Not yet legally reviewed" because no template is approved. Owner admin screen for templates is not built.

## E3 status (11 Nov)
Built and committed locally, not applied live: migration `20261111480000_agreement_pending_changes.sql` (one nullable `draft_data` column). Editing an agreement that is already issued now saves **pending changes** and leaves the signed wording, version and status untouched; issuing the changes makes the next version, keeps the old one, and clears the pending changes. The family sees a "changes haven't been issued" notice; every version and who signed it is listed under "Version history" with a short fingerprint; each signature is written to the audit log. **Behaviour change:** edits to an issued agreement no longer flow straight into working hours, rate and leave until they are issued. Not built: a side-by-side comparison of versions, signed PDF export (E4), and a provider decision (E5). **Migration must be applied before this code is published.**

## E4 status (11 Nov)
Built and committed locally, no database change: when both the parent and the nanny have signed an issued version, a **signed record copy** is saved as a PDF in the household's private vault (shown under Documents as "Signed agreement, version N"), made from the wording stored when that version was issued, with the signatures, their times and the version fingerprint. The writer is a small built-in one (no new dependency, because Lovable's lockfile makes new packages risky): plain typewriter-style text, no logos or fine layout. The history list says when a copy exists. A failure to save never blocks a signing. **Limits:** only versions signed from now on get a copy (earlier signed versions do not, and could be added by a one-off job); there is no manual "make PDF" button yet; it is a record copy, not a certified or qualified electronic signature (E5 is still the provider decision).

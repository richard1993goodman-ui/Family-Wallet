# Wallet improvements: nanny profile, checks & emergency contacts

## What we'll add

### 1. Nanny profile (new section in the wallet)
A card showing the nanny's photo, name, start date and a short bio/tagline you write — so the wallet feels personal, not just a document store.

### 2. Checks & credentials (DBS, ID, references, right to work)
New document slots per family, shown as tiles in the wallet with a status label:
- **DBS certificate** — upload the PDF, record issue date and certificate number
- **ID / right to work** — passport/visa copy, recorded as "Verified" with a date (families see that it was checked, not necessarily the document itself — your choice per upload)
- **References** — up to 2 reference documents or written summaries

Each item gets a visibility toggle in admin: **show document**, **show "verified" badge only**, or **hidden**. That way you can reassure families without exposing sensitive ID documents if you prefer.

### 3. Emergency contacts
Two small cards in the wallet:
- **Nanny's emergency contact** — name, relationship, phone
- **Family's emergency contacts** — up to 3 (parents, grandparent, doctor), entered by you in admin
Shown prominently near the top of the wallet, tap-to-call on mobile.

### 4. Quick wins while we're in there
- "Last updated" date on the wallet so families know the info is current
- Expiry reminders for you: DBS older than 3 years flags amber in the admin family list

## Admin changes
Family detail page gains: nanny emergency contact fields, family emergency contacts (add/remove), new document upload slots with visibility toggle, DBS issue date + certificate number fields.

## Technical details
- New table `family_contacts` (family_id, kind: nanny_emergency/family_emergency, name, relationship, phone, sort order) — admin-only RLS, read via server function after wallet unlock
- `family_documents` gains `visibility` column (document / badge / hidden), `issued_on`, `reference_label` for cert numbers
- Wallet server function returns contacts + checks only when unlocked; sensitive docs still served as 5-minute signed URLs
- Migration is additive only; existing families default to hidden checks so nothing shows until you fill it in

## Out of scope (say if you want them)
- Families editing their own emergency contacts (they're read-only today)
- Automated DBS renewal email reminders

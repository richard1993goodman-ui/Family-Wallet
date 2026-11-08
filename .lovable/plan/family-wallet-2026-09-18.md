# Family Wallet

A private, mobile-first wallet page for each new family. You send them a link plus a short access code; inside they find everything they need in one place.

## How a family gets in

- Each family gets their own link, e.g. `/w/smith-4f2a`, plus a 6-character access code you share separately.
- They enter the code once; the wallet stays unlocked on that device for 30 days.
- Wrong codes are rate-limited, and you can revoke or regenerate a code at any time.

## What the family sees

A branded card with the family name, their membership band, and tiles for:

1. **Nanny agreement** — the signed PDF you upload, viewable in the browser and downloadable.
2. **Nanny CV** — the PDF you upload, plus the nanny's name and a photo if you add one.
3. **Membership tier** — their days-per-week band and monthly fee taken from your published pricing (1 day £50, 2 £70, 3 £80, 4 £100, 5 £120, 6–7 £140, all + VAT), with the 4-month minimum then rolling monthly note, and the ad hoc / holiday / placement fees listed underneath.
4. **Membership terms and conditions** — shown inside the wallet as readable text, with a note of the date the family signed and a link to your Client Terms Hub if they need to re-sign.
5. **Family guarantee** — your commitment and guarantee content shown in full inside the wallet.
6. **Timesheet calculator** — opens Nanny Pay Tracker (nanny-time-pay.lovable.app).
7. **Nanny Fuel** — opens nanny-nourish-guide.lovable.app.
8. **Nanny activity guide** — opens nannyguide.lovable.app.
9. **Nanny agreement builder** — opens athletemanniesnannyagreement.lovable.app, for families who still need to create one.

Tools 6–9 open in a new tab so they always stay current; documents 1–5 live inside the wallet.

## Your admin area

A private admin login (email and password, just for you) where you can:

- Add a family: name, contact email, days-per-week band, nanny name, start date.
- Upload their nanny agreement PDF and nanny CV PDF (and an optional nanny photo).
- Record the date they accepted the terms.
- See and copy their wallet link and access code, regenerate the code, or archive the family.

## Build notes

- Lovable Cloud for the database, file storage and your admin login.
- Tables: `families` (slug, name, tier band, nanny name, terms accepted date, status), `family_documents` (type, storage path, uploaded date), `user_roles` for admin, plus a table of access-code attempts for rate limiting.
- Access codes are stored hashed; code checks, document signed-URL generation and all wallet reads happen in server functions so no family data is exposed to anonymous clients. Wallet data is fetched by slug + verified code session, never by open RLS.
- Documents stored in a private bucket; the wallet gets short-lived signed URLs.
- Guarantee and T&C copy is drawn from your existing Family Care Promise and Client Terms Hub projects so the wording matches.
- Routes: `/` short explainer + code entry helper, `/w/$slug` the wallet, `/admin` and `/admin/family/$id`.
- Mobile-first design in your Athlete Mannies brand; each route gets its own page title and description.

## Not included yet

- Families cannot edit anything; the wallet is read-only for them.
- No automatic sync from your other apps — membership band and documents are set by you in admin.

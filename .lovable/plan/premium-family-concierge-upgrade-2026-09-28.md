# Premium Family Concierge Upgrade

## Goal
Add the four agreed advantages to the private family wallet without turning Athlete Mannies into an open nanny marketplace or claiming services that have not been activated.

## What families will get

1. **Nannytax Managed Setup**
   - Replace the basic referral-code box with a guided payroll setup area.
   - Show a simple progress checklist: details needed, introduction requested, Nannytax setup, and payroll ready.
   - Let a parent request help from Athlete Mannies; the request appears in the existing agency support inbox.
   - Keep the referral code and Nannytax link available.

2. **All-In Employment Cost Calculator**
   - Add a parent-only calculator for gross hourly pay, weekly hours, working weeks, employer NI, pension, payroll fee, and optional extras.
   - Show weekly, monthly, annual, and true all-in hourly cost with a clear estimate disclaimer.
   - Let parents prefill pay and hours from the selected nanny agreement where available.
   - Keep this as planning guidance, not tax or payroll advice.

3. **Private Nanny Curation**
   - Add a premium concierge area explaining that candidates are hand-selected rather than listed publicly.
   - Show the family’s current search stage: brief received, search underway, shortlist sent, interviews, placement made, or paused.
   - Let parents request a new search or send an update through the existing in-wallet conversation system.
   - Do not create a public candidate directory or searchable nanny profiles.

4. **Insurance & Safeguarding Cover**
   - Add a family-facing safety page showing DBS, first aid, right-to-work, references, and public-liability-insurance status for each nanny.
   - Let the agency record insurer, policy/reference, cover dates, and upload/view the policy document privately.
   - Clearly show “not yet recorded” or “expired” where applicable; never imply cover exists unless the agency has entered it.

## Wallet and Agency Updates
- Add four clear tiles under a new **Concierge & employment** section in the wallet.
- Add all four benefits to the public “Inside your wallet” list.
- Add agency controls on each family record for payroll progress, private-curation stage, and insurance details.
- Keep nanny access limited: employment-cost and private-curation details remain parent-only; nannies may view their own safety/insurance status.

## Technical Details
- Add one secured family-services record for payroll and curation status, plus nanny-specific insurance fields/document references.
- Apply explicit grants and row-level security; wallet reads and writes continue through the existing link-and-code session checks, while agency changes require admin access.
- Add dedicated wallet pages for payroll concierge, cost calculator, private curation, and safety cover, each with a Back to wallet link and unique page metadata.
- Reuse the current support-thread flow for concierge requests instead of introducing a second messaging system.
- Validate calculations and statuses, then test locked-wallet, parent, nanny, agency, desktop, and mobile flows.

## Important Boundary
The app will present and track Nannytax onboarding and insurance coverage. It will not run payroll, file with HMRC, purchase insurance, or state that insurance is included until those external arrangements are actually in place.

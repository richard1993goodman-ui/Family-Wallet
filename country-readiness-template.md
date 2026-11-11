# Country readiness report (template)

Copy this file for each country, for example `readiness-ie.md`, and complete it before that country is added to `src/lib/countries.ts`. This is a checklist of questions and the evidence each needs. It contains no answers about any country, and supporting multiple languages or currencies is never evidence of legal compliance.

**Country and region:** ___  **Prepared by:** ___  **Date:** ___  **Status:** draft / under review / approved / rejected

A country is added to the platform only when every row below is marked **Evidenced**, each has a named reviewer where one is required, and the owner has signed off at the bottom.

| # | Area | What must be answered | Evidence required | Reviewer | Status |
|---|---|---|---|---|---|
| 1 | Market demand | Who would use it first, and how many households and agencies? Is there a launch partner? | Named prospects, agency conversations | Owner | Not started |
| 2 | Agency landscape | Which agencies exist, how do they place staff, who would we compete or partner with? | Short list with sources | Owner | Not started |
| 3 | Language and currency | Which languages and which currency do households use? Is a human translator available for the interface? | Translator named; currency and billing plan | Owner | Not started |
| 4 | Payment support | Can Stripe or another provider charge in this currency and country? Are there app-store payment rules that apply? | Provider capability page, store policy review | Owner | Not started |
| 5 | Tax | VAT or sales tax treatment of subscriptions, invoicing rules, any registration needed | Written advice | Qualified tax adviser | Not started |
| 6 | Employment law | How households employ domestic staff, written statement or contract rules, working time, holiday, notice, minimum pay | Written advice | Local employment lawyer | Not started |
| 7 | Agreement templates | Which templates are needed (employed, au pair, live-in, self-employed) and are they approved in this jurisdiction? | Approved template version with named reviewer and date | Local employment lawyer | Not started |
| 8 | Background checks | What checks exist, who may run them, what a household may store | Written advice | Local lawyer or provider | Not started |
| 9 | Safeguarding | Reporting duties, rules about children's information and photos | Written advice | Local safeguarding adviser | Not started |
| 10 | Privacy and data protection | Law that applies, lawful basis, children's data, retention and deletion rules, breach notification | Written advice and updated privacy notice | Data protection adviser | Not started |
| 11 | Data hosting and transfer | Where data is stored, whether transfers need safeguards, processor agreements for Supabase, Stripe, email, AI provider | Signed agreements, transfer assessment | Data protection adviser | Not started |
| 12 | Public holidays | Is a holiday provider with checked dates available for each region? | Source for dates and a test | Owner | Not started |
| 13 | Places | Postcode and phone formats, address fields | Format rules and tests | Owner | Not started |
| 14 | Support | Language and hours of support, escalation route, who answers safeguarding or security reports | Support plan | Owner | Not started |
| 15 | Operating cost | Support, translation, legal upkeep, payment fees, hosting | Cost estimate | Owner | Not started |

## Decision

**Recommendation:** enable / enable with conditions / do not enable yet

**Conditions and open risks:** ___

**Signed off by (owner):** ___  **Date:** ___

## After approval

1. Add the country to `src/lib/countries.ts` with its currency, time zone, language, postcode rule and holiday provider.
2. Add the holiday provider and its tests (never copy another country's dates).
3. Add the approved agreement templates through the template library (Stage E), with reviewer and date.
4. Switch it on for pilot households only, then widen.

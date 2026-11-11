# Stage F design: languages, currencies, time zones and countries (draft for review, nothing built)

Prepared 11 Nov 2026. Built from a code and live-database scan. The UK stays the first and only fully configured market; this stage makes the platform able to add others without rewrites. It does not claim any country's legal or tax compliance.

## 1. What is hard-coded today

| Area | Finding |
|---|---|
| Language | No i18n library. All interface text is written inline in English across routes and components; `<html lang="en-GB">` |
| Currency | The `£` symbol appears in about 30 files. Stripe prices are GBP only; copy says "excluding VAT" |
| Locale formatting | 68 uses of `en-GB` in date and number formatting |
| Time zones | 38 mentions, mostly UK assumptions; no per-household time zone |
| Money storage | 8 columns are `numeric` (expense amount, petty cash, timesheet rate, pocket money and others): precise, but **no currency column**. In `nanny_agreements`, `hourly_rate` is stored as **text** |
| Holidays | `bankHolidays(year)` in `work-hours.ts` is the England calendar only |
| Roles and legal text | UK employment wording (see Stage E) |
| Right-to-left | Not considered; layouts use left and right utilities |

## 2. Principles

1. UK English, GBP and Europe/London remain defaults; nothing changes for existing households.
2. Four separate settings, never conflated: **display language**, **display currency**, **billing currency** (what Stripe charges), and **country** (which rules and calendar apply). Changing a display currency never changes what is billed.
3. Money is stored as exact decimals with an ISO 4217 currency code, never floating point; historical amounts keep their original currency. If a conversion is ever shown, record the rate, source and time.
4. Times are stored as timestamps with time zone and shown in the user's zone.
5. Legal documents are never machine-translated and presented as approved (ties to Stage E).

## 3. Proposal

**F1, settings and formatting (no translation yet).**
Add `country`, `region`, `time_zone`, `currency` to the household (defaults GB, England, Europe/London, GBP) and `preferred_language` to `people` (already added in C1). One small formatting module replaces the scattered `£` and `en-GB` uses: `formatMoney(amount, currency)`, `formatDate`, `formatTime`, built on the browser's `Intl`. Add a `currency` column to the 8 money tables, defaulted to the household currency, and convert `agreement.hourly_rate` text to a typed value with a safe migration plan (read-only audit first).

**F2, translation framework.**
Adopt a standard message-catalogue library with plural and gender rules (i18next with ICU is the common choice), an `en-GB` source catalogue, and a language picker in onboarding and settings that suggests the device language but lets the user override. Extract strings in waves: sign-in and invitations first, then the wallet shell and menu, then feature pages. Expect several thousand strings. Emails and push notifications move to the same catalogues.

**F3, countries and calendars.**
A `countries` table (code, default currency, default time zone, default language, date and phone formats, public-holiday source) and a holiday provider per country replacing the England-only function. Postcode and phone fields accept the country's format. A **country readiness report** (legal, privacy, safeguarding, employment, payments, tax, operations) is a document produced before any country is switched on; I will draft the template, not the conclusions.

**F4, first extra language and right-to-left spike.**
Pick one non-English language and one right-to-left language (for example Arabic) to prove the pipeline: switch spacing and icons to logical properties, test mirrored layouts, and fix what breaks. Translations come from a human translator or reviewer, not from me.

**Billing in other currencies.**
Stripe needs separate prices per currency; amounts are chosen by you, not converted by us. Direct subscriptions and agency plans in another currency are a pricing decision, and app-store rules apply to in-app purchases (Stage G review).

## 4. Delivery steps (estimates)

| Step | Scope | Effort |
|---|---|---|
| F1 | Household settings, formatting module, currency columns, typed agreement rate | about 2 to 3 weeks |
| F2 | Library, English catalogue, picker, first two waves of strings | about 3 to 4 weeks, then ongoing waves |
| F3 | Countries, holiday providers, phone and postcode formats | about 2 weeks |
| F4 | One language, one right-to-left language, layout fixes | about 2 to 3 weeks plus translator time |

## 5. Decisions needed

1. **Start F1 now?** It is invisible to users and removes the hard-coding that blocks everything else. (Recommended: yes.)
2. **First additional market and language** (for example Ireland, France, UAE, Australia).
3. **Scope of string extraction:** the whole app, or only the signed-in wallet's core pages first.
4. **Translator source:** human translators, a vendor, or reviewed machine drafts for non-legal text only.
5. **Currency in other markets:** do you want price lists per currency decided by you, and from when?

## F1 status (11 Nov)
Built and committed locally, not applied live: migration `20261111460000_household_locale.sql` (household country, region, time zone and currency, all defaulting to UK, GBP and London; a `currency` column on the four money tables); `format.ts` with `formatMoney`, `formatDate` and `formatTime` and tests; and money display moved to `formatMoney` on the dashboards, timesheets, hours, live-in, handover, report and petty cash screens (pounds, now with thousands separators). **Not done yet:** the screens do not read the household currency yet (they always show pounds), the "(£)" labels on input fields are unchanged, the 68 `en-GB` date and number uses are not converted, `agreement.hourly_rate` is still text, and the new columns are not in the generated types.

## F2 status (11 Nov)
Built and committed locally, not pushed: a small translation core with no new dependency (`src/lib/i18n/`: message catalogues, `{placeholders}`, plural forms through the browser's own `Intl.PluralRules`, right-to-left detection, device-language suggestion), an `I18nProvider` mounted at the root, a language picker (hidden until a second language is enabled), and a **pseudo-language** for finding untranslated text (open any page with `?lang=pseudo`). **Wave 1 converted:** invitation link and code pages, the wallet-ready screen, create-your-own-login, the claim page, the account page and the household switcher. **Not done:** the wallet menu, feature pages, emails and push text (later waves); page titles (`<title>`) are still fixed English; no second real language exists, so nothing is translated yet; the chosen language is saved on the device only, not on the person's account; first paint is always English and then switches. Translations must come from a human translator or reviewer.

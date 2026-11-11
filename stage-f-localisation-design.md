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

## F2 wave 2 status (11 Nov)
Built and committed locally: the wallet menu is translatable. Every page label in both menus, the seven section names, the phone tab labels (with the household noun, for example "Au pair agreement"), the wallet frame (search, role line, lock and exit, navigation labels, the "More" drawer), the header quick-add and account menus, and the notification bell now come from the catalogue. English is word-for-word unchanged (a test compares the two). Open any wallet page with `?lang=pseudo` to see the menu and frame in pseudo-language. **Still English:** page contents (each feature page), the dashboards, toasts inside feature pages, the demo notification samples, and page titles. Those are waves 3 onward.

## F2 wave 3 status (11 Nov)
Built and committed locally: both home dashboards (parent and staff) and their parts (welcome card, next step, alerts prompt, setup progress, demo banner, emergency and staff sections) read from the catalogue, about 150 more messages, with counts and names passed as variables. English is unchanged. **Still English:** greeting words ("Good morning"), the sentence fragments around dose details and shift times on the staff dashboard, the Today, planner, messages, log and timesheets pages, and the month overview. Those are the next wave. The extraction was semi-automatic (a script found quoted text, I checked each case), so a wrong word is possible: open any home page with `?lang=pseudo` and read it against English.

## F2 wave 4 status (11 Nov)
Built and committed locally: the Today page and its timeline, messages, daily log, timesheets and the weekly planner read from the catalogue (about 145 more messages). English is unchanged. **Still English:** browser tab titles and page descriptions; sentences assembled from pieces (for example "5 shifts confirmed", "Nap 10:00 to 11:30", "on shift since"), date formats that still use fixed UK `en-GB`, and the month overview. Those need plural and date-format work and are the next wave. One script slip was caught and fixed: a type word was wrapped as if it were text, and a loop variable named `t` clashed with the translate function.

## F2 wave 5 status (11 Nov)
Built and committed locally: dates and money follow the chosen language everywhere (the shared formatter reads the language the provider sets), about 40 fixed UK date formats in wallet screens now use it, and the Today shift status, Today feed lines, timesheet and calendar toasts are proper messages with plural forms. English is unchanged. **Deliberately left fixed:** the dates inside agreements and statements (a signed document must not change with the interface language), server-side formatting, the agency admin pages and the month overview. **Still English:** page tab titles and descriptions, greetings, "h m" duration letters, strings inside emails and push notifications. No second language exists yet, so none of this is visible until one is enabled.

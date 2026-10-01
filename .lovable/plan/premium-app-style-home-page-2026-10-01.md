# Premium app-style home page

## Goal
Turn the public home page into a polished front door for the Family Wallet, matching the new in-wallet app experience while keeping family sign-in simple and the demo easy to discover.

## Changes
- Add a compact branded app header with an AM wallet mark, Athlete Mannies & Nannies identity, and a clearer membership-focused introduction.
- Rework the family login into the primary frosted panel, preserving the wallet-link field, access code, 12-month “Remember this device” option, error handling, and opening flow.
- Place a prominent “Explore the demo wallet” action within the first screen, visually distinct from the real family login and clearly labelled as sample content.
- Replace the long undifferentiated “Inside your wallet” list with grouped, icon-led sections such as:
  - Today & planning
  - Family & safety
  - Agreements & employment
  - Support, training & premium extras
- Keep every existing wallet benefit represented, with a concise first view and an expandable full-benefits area rather than removing features.
- Retain the wallet-opening guidance, help contact, and discreet agency sign-in lower on the page.
- Carry the premium glass treatment across desktop and mobile using the existing navy, gold, white, and soft neutral design tokens.
- Add restrained entrance and press feedback while respecting reduced-motion settings.

## Responsive layout
- Desktop: branded welcome area above a two-column login and wallet-preview layout.
- Mobile: native-app-style header, login first, demo directly beneath it, then compact benefit groups sized for thumb-friendly browsing.

## Technical details
- Limit implementation to the public home route and shared visual tokens needed by that page.
- Preserve the current secure link-and-code authentication and demo route unchanged.
- Use existing button, input, label, and icon components with semantic theme colours.
- Verify desktop and mobile layouts, login form behavior, demo navigation, agency link, and production build health.

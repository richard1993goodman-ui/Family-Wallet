# App-style Family Wallet navigation

## Goal
Turn the Family Wallet from a long page of links into a clearer app-style experience, while keeping every existing feature, access rule and family/nanny distinction intact.

## What will change
- Add a persistent desktop sidebar with the family name, clear icons, grouped navigation and a compact collapse mode.
- Add a phone navigation bar for the four everyday destinations: **Home**, **Calendar**, **Family** and **Documents**.
- Add a **More** button on phones that opens the full grouped menu, so every wallet feature remains easy to reach.
- Keep **This week** as the first content on the wallet home screen, followed by emergency details, children and nannies.
- Group the longer feature list into intuitive areas:
  - Today: Home, Calendar, Daily Log, Friday Report
  - Family: Emergency Card, Children, Nannies, Quick Guide
  - Work: Agreement, Timesheets, Leave, Handover & Expenses
  - Membership: Cover, Concierge, Perks, Playbooks
  - Help: Ask Athlete Mannies, Reviews, Training, Safety
- Show the current page clearly in both desktop and phone navigation.
- Keep urgent actions prominent, especially the Emergency Card and Request Cover.
- Keep parent-only items hidden from nanny accounts, matching the current wallet permissions.
- Preserve the existing visual identity, but tighten spacing and hierarchy so it feels like one connected app rather than separate cards.

## Navigation behaviour
- Desktop/tablet: collapsible left sidebar that remains available throughout wallet pages.
- Phone: fixed bottom tabs plus a slide-out **More** menu.
- Opening a feature keeps users inside the same app frame; existing back-to-wallet links remain as a secondary escape route.
- The menu closes automatically after a phone navigation choice.

## Technical details
- Build one reusable wallet navigation shell and navigation map shared by the wallet home and its feature pages.
- Use the existing sidebar and button controls, with explicit CSS variable widths to prevent content overlap.
- Derive active states from the current TanStack route and carry the wallet slug through every link.
- Apply safe-area spacing for iPhones and reserve content space above the phone tab bar.
- Do not alter wallet data, login codes, permissions, or feature business logic.
- Verify the demo wallet on phone and desktop sizes, including collapsed navigation, active states, the More menu, and parent/nanny visibility.

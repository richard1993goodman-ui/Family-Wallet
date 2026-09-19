# Today-first wallet, shared calendar and embedded nanny tools

## What will change

### 1. Make “Today” the first screen
- Replace the large membership panel at the top of the family wallet with today’s date, today’s schedule and a compact week calendar.
- Show agreement-based working hours automatically when today is a normal working day, including split shifts.
- Show today’s activities, meals, school notes and shift changes in time order.
- Add quick actions for parents and nanny to add a note, activity, meal or shift from the same panel.
- Keep the emergency card and unfinished nanny agreement prominent immediately below Today.

### 2. Turn the planner into a shared family calendar
- Give parents and the invited nanny access to the same calendar after using their separate secure codes.
- Let either person add and edit activities, notes, school holidays, inset days and one-off shifts, or cancel/change an agreement-based shift for a specific date.
- Treat the signed agreement’s working pattern as the default schedule; dated changes override it without altering the agreement itself.
- Keep the weekly planner view, add a proper month/date view, and highlight today.

### 3. Bring Nanny Activity Guide into the wallet
- Add an in-wallet activity generator using the existing Activity Genie logic and the family’s child details where available.
- Let users save useful activities to the family wallet.
- Add a saved activity directly to a chosen calendar date and time for parent review.

### 4. Bring Nanny Fuel into the wallet
- Add an in-wallet meal and recipe idea generator using the existing Nanny Fuel logic.
- Let users save recipes to the family wallet and add a selected meal to the shared calendar.
- Keep saved meals and activities available to both parent and nanny.

### 5. Bring timesheets and shift approval into the wallet
- Add shift entry with date, start/end time, optional split/overnight handling, break, rate override and notes.
- Calculate worked hours and pay using the proven Nanny Pay Tracker calculations.
- Put submitted shifts on the shared calendar.
- Allow the parent to approve or decline every submitted shift; the nanny can see the decision but cannot approve their own work.
- Show pending and approved totals clearly. Approval will always be available, as requested, regardless of NannyTax use.

### 6. De-emphasise membership
- Remove pricing, tier details and “Other fees” from the wallet.
- Move membership to the bottom of the parent wallet as a small “Membership: Active” status only.
- Hide membership information from the nanny view.
- Replace the old external tool cards with the new in-wallet Activity Guide, Nanny Fuel and Timesheets destinations.

## Access and privacy
- The family link and code remain unchanged.
- The nanny keeps a separate invitation link and code, but after sign-in lands on a limited work dashboard rather than only the agreement.
- Nanny access includes Today, shared calendar, daily notes, emergency card, agreement, activities, meals, training and timesheets.
- Family-only details, membership and parent approval controls remain hidden from the nanny.

## Technical details
- Add tables for calendar exceptions/items, saved activities/meals and timesheet shifts, each locked from direct browser access and used only after validating the family or nanny wallet session.
- Store whether each calendar item was added by the parent or nanny for clear handover history.
- Derive recurring workdays from `agreement_data.workingDays`; store only dated cancellations or changes so agreement edits remain the source of truth.
- Reuse the existing AI Gateway patterns for structured activity and meal suggestions, with review before saving.
- Add separate routes for Activities, Nanny Fuel and Timesheets, each with private/no-index page metadata.
- Verify parent and nanny permissions, calculations, calendar overrides, and mobile/desktop layouts in the live preview.

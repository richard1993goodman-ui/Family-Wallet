# Family Wallet: from documents to a working hub

Three builds, in order. Each one ships complete before the next starts, so you can put it in front of a family straight away.

Anyone holding the family link and the access code can now add and edit these new sections — parents and nanny share the same way in. Everything stays behind the code; nothing sensitive is visible until it is entered. Activity Genie and Nanny Fuel keep linking out as they do today.

---

## Build 1 — Know My Family

A "Your family" area the parent fills in once, and a nanny-facing quick guide generated from it.

**Household details**
- Home address and any important addresses
- House rules, screen-time rules, homework expectations
- Doctor/GP details and general medical notes
- Parent contacts (this reuses the emergency contacts you already have)

**A card per child**
- Name, date of birth, photo
- School, year group, school hours
- Allergies, dietary needs, medication
- Personality, interests, favourite activities, dislikes
- Morning and bedtime routines
- "What makes them tick"

**Nanny Quick Guide**
A single read-only page pulling the essentials together — allergies, routines, school, contacts — designed to be readable on a phone in one scroll, and printable.

**Emergency card**
A prominent button at the top of the wallet opening one screen: parent contacts, GP, school, allergies, medication, home address, emergency instructions. Same code protection as the rest.

---

## Build 2 — Weekly planner and daily log

**Weekly planner**
A Monday–Sunday view. Each day holds short entries (time + what's happening + which child), e.g. "15:45 school pickup", "17:00 football". Parents and nanny can both add, edit and remove. A "copy last week" button so a regular routine takes seconds to set up. The current week shows on the wallet home with today highlighted.

**Daily log**
After a shift the nanny taps "Add today's update" and fills in as much or as little as they like:
- What we did
- What we ate
- Homework
- Mood (a simple picker)
- Anything noteworthy
- Tomorrow's requirements

Entries appear newest-first with the date, and the last one shows on the wallet home. Nothing is compulsory — a one-line entry is valid.

---

## Build 3 — Ask Athlete Mannies

A large "Ask Athlete Mannies" panel in the wallet. The family types a question and it appears as a conversation thread. You answer from your admin area, and the reply shows in their wallet with a "new reply" marker.

- Threads keep their full history
- You see every family's open questions in one list in admin, newest first, with unanswered ones flagged
- Quick-start prompts underneath the box ("holiday pay", "replacement nanny", "behaviour at pickup") to make it obvious what it's for

No AI drafting in this build — answers come from you. That can be added later once you see the kinds of questions coming in.

---

## Wallet home, reorganised

Once the three builds land, the wallet home becomes a set of grouped sections rather than one long list:

```text
Welcome, [Family] 
Your nanny: [Name] — placement active since [date]

Emergency card                 (big, always top)
Your family    Family profile | Children | House rules
This week      Planner | Latest daily log
Your nanny     CV | Agreement | Checks | Timesheets
Activities     Activity Genie | Nanny Fuel  (open in a new tab)
Support        Ask Athlete Mannies
Membership     Tier and price | Guarantee | Nannytax code
```

---

## Later, not now

Nanny training modules, the activity and meal generators inside the wallet, school term-date hub, family perks, and the year-in-review summary. All fit on top of what this plan builds; none of them are needed to make the wallet feel like a service.

---

## Technical notes

- New tables: `family_profile` (one row per family: addresses, rules, medical notes), `family_children`, `planner_entries` (family, date or weekday, time, title, child), `daily_logs`, `support_threads` and `support_messages`. All RLS admin-only, as with the existing tables.
- Family reads and writes go through new server functions that check the existing wallet session cookie via `isUnlocked(slug)` before touching anything — same pattern as `loadWallet`. No open anon policies, no client-side Supabase access for family data.
- Child photos go in the existing private `family-docs` bucket under the family's folder, served with the same short-lived signed URLs.
- Input validated with zod in the handlers (length caps on free-text, sensible limits: 8 children, 40 planner entries per week, 4000 characters per log).
- Write actions are rate-limited per wallet session to prevent abuse of an unlocked link.
- The wallet page gets split into section components to keep it manageable; admin gets a support inbox route and read-only views of each family's profile, planner and logs.
- Each new route carries its own title and description; wallet routes stay noindex.

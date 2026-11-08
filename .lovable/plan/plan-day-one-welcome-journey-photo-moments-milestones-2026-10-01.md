# Plan: Day-One Welcome Journey + Photo Moments & Milestones

Two new wallet features, following the existing patterns (link-and-code sessions via `requireFamily` / `requireSharedFamily`, server functions in `src/lib/*.functions.ts` + `*.server.ts`, admin storage uploads, wallet tile + "Inside your wallet" list + app-shell navigation).

## 1. Day-One Welcome Journey

A guided first-week setup path shown until the family's wallet is fully set up.

**Database (migration):**
- New table `welcome_progress` (family_id unique, steps jsonb, completed_at nullable, created_at, updated_at).
- GRANTs + RLS + policy in the same migration (service_role access via server functions; admin-role policy pattern consistent with existing tables).

**New route `/welcome/$slug`** (`src/routes/welcome.$slug.tsx`):
- Progress ring + step cards: 1) Nanny agreement, 2) Emergency card & family details, 3) Key contacts, 4) Know my family (children), 5) Weekly planner & working days, 6) Invite your nanny, 7) Daily log / handover trial.
- Steps auto-check from existing data (agreement exists/signed, children count, contacts count, nanny invited, planner entries, log entries); anything not auto-detectable can be marked done manually.
- Each card links straight to the matching wallet page.
- Dismissible: once all steps are done (or the family clicks "Finish setup"), the card disappears from the wallet home.

**Wallet home:** progress card shown near the top while incomplete ("Finish setting up your wallet — 3 of 7 done"), deep-links into the journey. Add a navigation entry under More in `WalletAppShell`.

## 2. Photo Moments & Milestones

**Database (migration):**
- New table `family_moments`: family_id, nanny_id (nullable FK), child_id (nullable FK to family_children), kind ('photo' | 'milestone'), moment_date, caption, milestone_label (nullable), storage_path (nullable), added_by, added_by_name, created_at.
- GRANTs + RLS + policy in the same migration.

**New `src/lib/moments.functions.ts` / `moments.server.ts`:**
- `saveMomentPhoto` — receives file bytes in the handler (same pattern as existing document uploads) and stores in the private `family-docs` bucket under `moments/{familyId}/`; `loadMoments` lists photos and milestones with signed URLs for photos; delete photo removes the storage object too.
- Both parent and nanny (via shared/nanny session, same authorization as the daily log) can add photos and milestones.

**New route `/moments/$slug`** (`src/routes/moments.$slug.tsx`):
- Photo gallery grouped by date, add-photo form (photo + caption + child, optional milestone flag), and a milestone journal per child (date + note, e.g. "first week on cargo bike").
- "Weekly recap" view of the last 7 days, printable.

**Wallet home:** tile in "Inside your wallet" + navigation entry in `WalletAppShell`.

## Cross-cutting

- Both routes get their own `head()` metadata (title, description, og tags); `noindex` for the not-found variants, consistent with other wallet pages.
- Update the demo wallet so the journey card and moments page render sensibly with demo data (journey auto-checks from the demo family's existing rows; 2-3 sample moments seeded via migration for the demo slug only).
- Update `AGENTS.md` if any structural convention is added; no existing feature behavior changes.
- Verify: `bunx tsgo --noEmit -p .`, build log clean, Playwright check of the demo wallet (welcome card, moments gallery, photo upload path reachable).

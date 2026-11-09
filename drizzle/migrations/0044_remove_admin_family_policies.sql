-- Owner split: the platform admin login must not read family data directly through the database API.
-- All wallet and agency access goes through server functions using the service role, which keeps working.
-- With no policy left, row-level security denies every non-service request on these tables.
DROP POLICY IF EXISTS "Admins manage care events" ON public.care_events;
DROP POLICY IF EXISTS "Admins manage cover requests" ON public.cover_requests;
DROP POLICY IF EXISTS "Admins manage daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Admins manage document signatures" ON public.document_signatures;
DROP POLICY IF EXISTS "Admins can manage expense claims" ON public.expense_claims;
DROP POLICY IF EXISTS "Admins manage families" ON public.families;
DROP POLICY IF EXISTS "Admins manage family children" ON public.family_children;
DROP POLICY IF EXISTS "Admins manage family contacts" ON public.family_contacts;
DROP POLICY IF EXISTS "Admins manage family documents" ON public.family_documents;
DROP POLICY IF EXISTS "Admins manage family moments" ON public.family_moments;
DROP POLICY IF EXISTS "Admins manage family nannies" ON public.family_nannies;
DROP POLICY IF EXISTS "Admins manage family profile" ON public.family_profile;
DROP POLICY IF EXISTS "Admins manage family services" ON public.family_services;
DROP POLICY IF EXISTS "Admins can manage handover checklists" ON public.handover_checklists;
DROP POLICY IF EXISTS "Admins manage household messages" ON public.household_messages;
DROP POLICY IF EXISTS "Admins manage household threads" ON public.household_threads;
DROP POLICY IF EXISTS "Admins manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins manage medication doses" ON public.medication_doses;
DROP POLICY IF EXISTS "Admins manage nanny agreements" ON public.nanny_agreements;
DROP POLICY IF EXISTS "Admins manage nanny safety documents" ON public.nanny_safety_documents;
DROP POLICY IF EXISTS "Admins manage petty cash" ON public.petty_cash_entries;
DROP POLICY IF EXISTS "Admins manage planner entries" ON public.planner_entries;
DROP POLICY IF EXISTS "Admins view playbook reads" ON public.playbook_reads;
DROP POLICY IF EXISTS "Admins manage playbook recipients" ON public.playbook_recipients;
DROP POLICY IF EXISTS "Admins manage review checkins" ON public.review_checkins;
DROP POLICY IF EXISTS "Admins can manage sports passport entries" ON public.sports_passport_entries;
DROP POLICY IF EXISTS "Admins manage support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins manage support threads" ON public.support_threads;
DROP POLICY IF EXISTS "Admins manage training attempts" ON public.training_attempts;
DROP POLICY IF EXISTS "Admins manage travel trips" ON public.travel_trips;
DROP POLICY IF EXISTS "Admins manage first 48 hours checkins" ON public.welcome_checkins;
DROP POLICY IF EXISTS "Admins manage welcome progress" ON public.welcome_progress;

-- Family Wallet: structure of the live database as read on 14 Nov 2026 (read-only catalogue queries).
-- Structure only: no rows, no family data. Used to build the test project (family-wallet-test).
-- Not a migration: it lives outside supabase/migrations so Lovable never runs it against live.
-- Table grants are at the end: live gives anon and authenticated every privilege on all 70 tables; new projects no longer do.

begin;
set local check_function_bodies = off; -- functions call each other; skip body checks during creation

create type public.app_role as enum ('admin');

create table public.account_claims (id uuid not null default gen_random_uuid(), member_id uuid not null, token_hash text not null, expires_at timestamp with time zone not null, used_at timestamp with time zone, created_at timestamp with time zone not null default now(), email text);
create table public.agency_challenges (id uuid not null default gen_random_uuid(), title text not null, description text, due_date date, audience text not null default 'all'::text, is_active boolean not null default true, created_at timestamp with time zone not null default now(), agency_id uuid);
create table public.agency_invites (id uuid not null default gen_random_uuid(), agency_id uuid not null, slot integer not null, email text not null, token_hash text, status text not null default 'pending'::text, invited_at timestamp with time zone not null default now(), expires_at timestamp with time zone, accepted_at timestamp with time zone, released_at timestamp with time zone, family_id uuid, nanny_name text, nanny_email text, code_hash text, created_by uuid);
create table public.agency_terms (id uuid not null default gen_random_uuid(), agency_id uuid, storage_path text not null, file_name text not null, version integer not null default 1, uploaded_at timestamp with time zone not null default now());
create table public.agreement_template_versions (id uuid not null default gen_random_uuid(), template_id uuid not null, version integer not null, body jsonb not null, status text not null default 'draft'::text, reviewer_name text, reviewer_role text, reviewed_at date, review_notes text, changelog text, created_at timestamp with time zone not null default now());
create table public.agreement_templates (id uuid not null default gen_random_uuid(), kind text not null, jurisdiction text not null, language text not null default 'en'::text, title text not null, created_at timestamp with time zone not null default now());
create table public.agreement_versions (id uuid not null default gen_random_uuid(), agreement_id uuid not null, family_id uuid not null, nanny_id uuid, version integer not null, snapshot_text text not null, content_hash text not null, issued_at timestamp with time zone not null default now(), template_version_id uuid);
create table public.audit_log (id uuid not null default gen_random_uuid(), at timestamp with time zone not null default now(), actor_kind text not null, actor_id text, action text not null, family_id uuid, agency_id uuid, reason text, meta jsonb not null default '{}'::jsonb);
create table public.care_events (id uuid not null default gen_random_uuid(), family_id uuid not null, child_id uuid, kind text not null, started_at timestamp with time zone not null default now(), ended_at timestamp with time zone, amount_ml integer, detail text, added_by text not null, created_at timestamp with time zone not null default now());
create table public.challenge_completions (id uuid not null default gen_random_uuid(), challenge_id uuid not null, family_id uuid not null, note text, completed_by text not null, completed_at timestamp with time zone not null default now());
create table public.challenge_recipients (id uuid not null default gen_random_uuid(), challenge_id uuid not null, family_id uuid not null);
create table public.cover_requests (id uuid not null default gen_random_uuid(), family_id uuid not null, cover_type text not null default 'emergency'::text, start_date date not null, end_date date, start_time text, end_time text, children text, location text, notes text, status text not null default 'new'::text, requested_by text not null default 'family'::text, thread_id uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.daily_logs (id uuid not null default gen_random_uuid(), family_id uuid not null, log_date date not null, activities text, food text, homework text, mood text, notes text, tomorrow text, created_at timestamp with time zone not null default now());
create table public.deleted_households (family_id uuid not null, deleted_at timestamp with time zone not null default now(), reason text not null, was_agency_funded boolean not null default false);
create table public.document_signatures (id uuid not null default gen_random_uuid(), family_id uuid not null, doc_kind text not null, signer_role text not null, signer_name text not null, doc_version text not null default '1'::text, client_key text, signed_at timestamp with time zone not null default now(), nanny_id uuid, agreement_version_id uuid, content_hash text, verified_email text, verified_at timestamp with time zone);
create table public.expense_claims (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, expense_date date not null default CURRENT_DATE, item text not null, amount numeric(10,2) not null default 0, category text not null default 'other'::text, notes text, status text not null default 'pending'::text, submitted_by text not null default 'family'::text, submitted_by_name text, reviewed_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), currency text not null default 'GBP'::text);
create table public.families (id uuid not null default gen_random_uuid(), slug text not null, family_name text not null, contact_email text, contact_phone text, tier_band text not null default '3'::text, nanny_name text, start_date date, terms_accepted_on date, notes text, access_code_hash text not null, status text not null default 'active'::text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), access_code text default ''::text, nanny_bio text, nanny_photo_path text, nanny_emergency_name text, nanny_emergency_relationship text, nanny_emergency_phone text, nannytax_code text, nanny_code text, nanny_code_hash text, nanny_invited_at timestamp with time zone, intro_fee_percent numeric, partner_agency_id uuid, fee_label text, fee_amount text, last_active_at timestamp with time zone, use_agreement boolean not null default true, invite_sent_at timestamp with time zone, agreement_policy text not null default 'family'::text, parent_photo_path text, parent_last_seen_at timestamp with time zone, agency_released_at timestamp with time zone, entitlement text, transition_ends_at timestamp with time zone, agreement_choice text, country text not null default 'GB'::text, region text, time_zone text not null default 'Europe/London'::text, currency text not null default 'GBP'::text, locked_at timestamp with time zone, delete_after timestamp with time zone, deletion_hold boolean not null default false, deletion_notices jsonb not null default '[]'::jsonb, deletion_confirmed boolean not null default false);
create table public.family_children (id uuid not null default gen_random_uuid(), family_id uuid not null, name text not null, date_of_birth date, photo_path text, school text, year_group text, school_hours text, allergies text, dietary text, medication text, personality text, interests text, dislikes text, morning_routine text, bedtime_routine text, what_makes_them_tick text, sort_order integer not null default 0, created_at timestamp with time zone not null default now());
create table public.family_contacts (id uuid not null default gen_random_uuid(), family_id uuid not null, name text not null, relationship text, phone text not null, sort_order integer not null default 0, created_at timestamp with time zone not null default now());
create table public.family_documents (id uuid not null default gen_random_uuid(), family_id uuid not null, doc_type text not null, storage_path text not null, file_name text not null, uploaded_at timestamp with time zone not null default now(), visibility text not null default 'document'::text, issued_on date, reference_label text);
create table public.family_moments (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, child_id uuid, kind text not null default 'photo'::text, moment_date date not null, caption text, milestone_label text, storage_path text, added_by text not null, added_by_name text, created_at timestamp with time zone not null default now());
create table public.family_nannies (id uuid not null default gen_random_uuid(), family_id uuid not null, name text not null, bio text, photo_path text, emergency_name text, emergency_relationship text, emergency_phone text, nanny_code text, nanny_code_hash text, invited_at timestamp with time zone, status text not null default 'active'::text, sort_order integer not null default 0, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), insurance_provider text, insurance_policy_number text, insurance_cover_from date, insurance_cover_until date, role text not null default 'nanny'::text, last_seen_at timestamp with time zone);
create table public.family_profile (id uuid not null default gen_random_uuid(), family_id uuid not null, home_address text, important_addresses text, house_rules text, screen_time_rules text, homework_expectations text, gp_details text, medical_notes text, emergency_instructions text, updated_at timestamp with time zone not null default now());
create table public.family_services (id uuid not null default gen_random_uuid(), family_id uuid not null, payroll_status text not null default 'not_started'::text, payroll_start_date date, payroll_notes text, curation_status text not null default 'not_started'::text, curation_notes text, updated_at timestamp with time zone not null default now(), created_at timestamp with time zone not null default now());
create table public.family_subscriptions (id uuid not null default gen_random_uuid(), family_id uuid, stripe_customer_id text not null, stripe_subscription_id text, stripe_checkout_session_id text not null, plan text not null, billing_interval text not null, status text not null default 'active'::text, current_period_end timestamp with time zone, cancel_at_period_end boolean not null default false, customer_email text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), environment text not null default 'sandbox'::text, agency_id uuid);
create table public.handover_checklists (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, handover_date date not null default CURRENT_DATE, homework_status text, dinner_status text, water_status text, mood text, energy text, school_bag_ready boolean not null default false, pe_kit_ready boolean not null default false, reading_done boolean not null default false, tomorrow_notes text, parent_notes text, submitted_by text not null default 'family'::text, submitted_by_name text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.house_manual_entries (id uuid not null default gen_random_uuid(), family_id uuid not null, category text not null, title text not null, notes text not null default ''::text, secret_value text, updated_at timestamp with time zone not null default now(), has_secret boolean generated always as ((secret_value IS NOT NULL) AND (secret_value <> ''::text)) stored);
create table public.household_members (id uuid not null default gen_random_uuid(), family_id uuid not null, person_id uuid, role text not null, nanny_id uuid, status text not null default 'active'::text, permissions jsonb not null default '{}'::jsonb, started_at timestamp with time zone not null default now(), ended_at timestamp with time zone, revoked_by uuid);
create table public.household_messages (id uuid not null default gen_random_uuid(), thread_id uuid not null, sender text not null, sender_name text, body text not null, created_at timestamp with time zone not null default now());
create table public.household_permissions (id uuid not null default gen_random_uuid(), family_id uuid not null, permission_key text not null, label text not null, category text not null default 'other'::text, answer text not null, note text not null default ''::text, is_custom boolean not null default false, updated_by_name text, updated_at timestamp with time zone not null default now());
create table public.household_threads (id uuid not null default gen_random_uuid(), family_id uuid not null, topic text not null default 'general'::text, title text not null, created_by text not null, last_sender text not null, family_unread boolean not null default false, nanny_unread boolean not null default false, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.incident_reports (id uuid not null default gen_random_uuid(), family_id uuid not null, child_name text not null, occurred_at timestamp with time zone not null default now(), kind text not null default 'accident'::text, severity text not null default 'minor'::text, what_happened text not null, action_taken text not null default ''::text, parents_told boolean not null default false, reported_by text not null default 'nanny'::text, reported_by_name text, acknowledged_at timestamp with time zone, acknowledged_by_name text, created_at timestamp with time zone not null default now());
create table public.kids_playbook_entries (id uuid not null default gen_random_uuid(), family_id uuid not null, category text not null, child_name text not null default ''::text, title text not null, notes text not null default ''::text, added_by text not null default 'family'::text, updated_at timestamp with time zone not null default now());
create table public.leave_requests (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, leave_type text not null default 'holiday'::text, start_date date not null, end_date date not null, days numeric not null default 0, notes text, status text not null default 'pending'::text, requested_by text not null default 'nanny'::text, reviewed_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.live_in_settings (family_id uuid not null, weekly_pocket_money numeric(8,2) not null default 0, max_weekly_hours numeric(5,2) not null default 30, days_off_per_week integer not null default 2, room_and_board text, house_rules text, study_schedule text, updated_at timestamp with time zone not null default now(), currency text not null default 'GBP'::text);
create table public.live_in_weeks (id uuid not null default gen_random_uuid(), family_id uuid not null, week_start date not null, hours_worked numeric(5,2) not null default 0, days_off integer not null default 0, pocket_money_paid boolean not null default false, note text, created_at timestamp with time zone not null default now());
create table public.medication_doses (id uuid not null default gen_random_uuid(), family_id uuid not null, child_name text not null, medicine text not null, dose text, given_at timestamp with time zone not null default now(), given_by text not null default 'family'::text, given_by_name text, next_dose_from timestamp with time zone, reason text, notes text, created_at timestamp with time zone not null default now());
create table public.moment_reactions (moment_id uuid not null, family_id uuid not null, by_role text not null, created_at timestamp with time zone not null default now());
create table public.nanny_agreements (id uuid not null default gen_random_uuid(), family_id uuid not null, employer_names text, nanny_name text, start_date date, work_pattern text, hours text, hourly_rate text, pay_basis text, holiday text, notice_period text, probation text, duties text, pension text, additional_terms text, status text not null default 'draft'::text, version integer not null default 1, issued_at timestamp with time zone, updated_at timestamp with time zone not null default now(), created_at timestamp with time zone not null default now(), agreement_data jsonb not null default '{}'::jsonb, nanny_id uuid, draft_data jsonb);
create table public.nanny_bank_details (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid not null, account_name text not null, bank_name text, sort_code text, account_number text, iban text, swift text, payment_reference text, updated_at timestamp with time zone not null default now());
create table public.nanny_safety_documents (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid not null, document_type text not null, storage_path text not null, file_name text not null, issued_on date, expires_on date, reference_label text, visibility text not null default 'badge'::text, uploaded_at timestamp with time zone not null default now());
create table public.nanny_work_hours (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid not null, working_days jsonb not null default '[]'::jsonb, updated_at timestamp with time zone not null default now(), schedule jsonb not null default '{}'::jsonb);
create table public.partner_agencies (id uuid not null default gen_random_uuid(), name text not null, short_name text, contact_email text, contact_phone text, status text not null default 'active'::text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), brand_name text, intro_pricing boolean not null default false, allow_challenges boolean not null default false, allow_perks boolean not null default false, allow_playbooks boolean not null default false, logo_data text, plan text not null default 'partner'::text, household_allowance integer, agreements_enabled boolean not null default true);
create table public.partner_agency_staff (id uuid not null default gen_random_uuid(), agency_id uuid not null, email text not null, user_id uuid, created_at timestamp with time zone not null default now());
create table public.partner_perks (id uuid not null default gen_random_uuid(), title text not null, partner_name text not null, category text not null default 'Family services'::text, area text, offer_text text not null, description text, redemption_instructions text, offer_code text, website_url text, contact_text text, expires_on date, is_published boolean not null default false, sort_order integer not null default 0, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), agency_id uuid);
create table public.people (id uuid not null default gen_random_uuid(), user_id uuid not null, display_name text not null, preferred_language text not null default 'en'::text, time_zone text not null default 'Europe/London'::text, created_at timestamp with time zone not null default now());
create table public.petty_cash_entries (id uuid not null default gen_random_uuid(), family_id uuid not null, kind text not null, entry_date date not null, amount numeric(10,2) not null, description text not null, added_by text not null, added_by_name text, created_at timestamp with time zone not null default now(), currency text not null default 'GBP'::text);
create table public.planner_entries (id uuid not null default gen_random_uuid(), family_id uuid not null, entry_date date not null, time_label text, title text not null, child_name text, created_at timestamp with time zone not null default now(), entry_type text not null default 'note'::text, end_time_label text, status text not null default 'active'::text, added_by text not null default 'family'::text, notes text, approval text not null default 'approved'::text);
create table public.playbook_reads (id uuid not null default gen_random_uuid(), playbook_id uuid not null, family_id uuid not null, reader_role text not null, read_at timestamp with time zone not null default now());
create table public.playbook_recipients (id uuid not null default gen_random_uuid(), playbook_id uuid not null, family_id uuid not null, created_at timestamp with time zone not null default now());
create table public.push_subscriptions (id uuid not null default gen_random_uuid(), family_id uuid not null, slug text not null, role text not null, endpoint text not null, muted_features text[] not null default '{}'::text[], quiet_start smallint, quiet_end smallint, tz text not null default 'Europe/London'::text, last_delivered_at timestamp with time zone not null default now(), created_at timestamp with time zone not null default now());
create table public.review_checkins (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, kind text not null default 'six_month'::text, status text not null default 'draft'::text, answers jsonb not null default '{}'::jsonb, author text not null default 'family'::text, call_requested boolean not null default false, thread_id uuid, completed_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.saved_resources (id uuid not null default gen_random_uuid(), family_id uuid not null, resource_type text not null, title text not null, summary text, details jsonb not null default '{}'::jsonb, saved_by text not null default 'family'::text, created_at timestamp with time zone not null default now());
create table public.seasonal_playbooks (id uuid not null default gen_random_uuid(), title text not null, season text not null, topic text not null, introduction text, age_guidance text, sections jsonb not null default '[]'::jsonb, cover_image_url text, resource_url text, audience text not null default 'all'::text, is_featured boolean not null default false, is_published boolean not null default false, published_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), agency_id uuid);
create table public.shift_sessions (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, started_at timestamp with time zone not null default now(), ended_at timestamp with time zone, break_minutes integer not null default 0, timesheet_shift_id uuid);
create table public.signing_codes (id uuid not null default gen_random_uuid(), family_id uuid not null, signer_role text not null, email text not null, code_hash text not null, expires_at timestamp with time zone not null, used_at timestamp with time zone, attempts integer not null default 0, created_at timestamp with time zone not null default now());
create table public.sports_passport_entries (id uuid not null default gen_random_uuid(), family_id uuid not null, child_name text not null, activity text not null, skill_area text not null default 'general'::text, confidence_level integer not null default 3, effort_level integer not null default 3, minutes integer not null default 30, badge text, notes text, logged_by text not null default 'family'::text, logged_by_name text, entry_date date not null default CURRENT_DATE, created_at timestamp with time zone not null default now());
create table public.support_messages (id uuid not null default gen_random_uuid(), thread_id uuid not null, sender text not null, body text not null, created_at timestamp with time zone not null default now());
create table public.support_threads (id uuid not null default gen_random_uuid(), family_id uuid not null, subject text not null, status text not null default 'open'::text, last_sender text not null default 'family'::text, family_unread boolean not null default false, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), nanny_unread boolean not null default false);
create table public.timesheet_shifts (id uuid not null default gen_random_uuid(), family_id uuid not null, shift_date date not null, start_time text not null, end_time text not null, break_minutes integer not null default 0, is_overnight boolean not null default false, hourly_rate numeric(10,2) not null default 0, notes text, submitted_by text not null default 'nanny'::text, status text not null default 'pending'::text, reviewed_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), shift_type text not null default 'nanny'::text, currency text not null default 'GBP'::text);
create table public.training_attempts (id uuid not null default gen_random_uuid(), family_id uuid not null, learner_name text not null, score integer not null, total integer not null, passed boolean not null default false, certificate_ref text not null, answers jsonb not null default '{}'::jsonb, completed_at timestamp with time zone not null default now());
create table public.travel_trips (id uuid not null default gen_random_uuid(), family_id uuid not null, destination text not null, start_date date not null, end_date date not null, accommodation text, local_emergency text, nearest_hospital text, time_difference text, travel_pay text, notes text, checklist jsonb not null default '[]'::jsonb, handover_notes jsonb not null default '[]'::jsonb, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.user_roles (id uuid not null default gen_random_uuid(), user_id uuid not null, role public.app_role not null, created_at timestamp with time zone not null default now());
create table public.wallet_access_attempts (id uuid not null default gen_random_uuid(), slug text not null, client_key text not null, succeeded boolean not null default false, attempted_at timestamp with time zone not null default now());
create table public.wallet_activity (id uuid not null default gen_random_uuid(), family_id uuid not null, feature text not null, actor text not null, summary text not null, created_at timestamp with time zone not null default now());
create table public.wallet_documents (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid, category text not null, title text not null, file_name text not null, content_type text not null, size_bytes integer not null, storage_path text not null, issued_on date, expires_on date, shared_with_staff boolean not null default false, uploaded_by text not null, uploaded_by_nanny_id uuid, created_at timestamp with time zone not null default now());
create table public.wallet_pair_pins (id uuid not null default gen_random_uuid(), slug text not null, pin_hash text not null, expires_at timestamp with time zone not null, used_at timestamp with time zone, created_at timestamp with time zone not null default now());
create table public.wallet_seen (family_id uuid not null, role text not null, feature text not null, seen_at timestamp with time zone not null default now());
create table public.welcome_checkins (id uuid not null default gen_random_uuid(), family_id uuid not null, nanny_id uuid not null, step_id text not null, confirmed_by text not null, confirmed_at timestamp with time zone, note text not null default ''::text, updated_at timestamp with time zone not null default now());
create table public.welcome_progress (family_id uuid not null, steps jsonb not null default '{}'::jsonb, finished_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());

-- Primary keys, unique and check constraints
alter table public.account_claims add constraint account_claims_pkey PRIMARY KEY (id);
alter table public.account_claims add constraint account_claims_token_hash_key UNIQUE (token_hash);
alter table public.agency_challenges add constraint agency_challenges_pkey PRIMARY KEY (id);
alter table public.agency_invites add constraint agency_invites_pkey PRIMARY KEY (id);
alter table public.agency_invites add constraint agency_invites_slot_check CHECK ((slot > 0));
alter table public.agency_invites add constraint agency_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'released'::text])));
alter table public.agency_terms add constraint agency_terms_pkey PRIMARY KEY (id);
alter table public.agreement_template_versions add constraint agreement_template_versions_check CHECK (((status <> 'approved'::text) OR ((reviewer_name IS NOT NULL) AND (reviewed_at IS NOT NULL))));
alter table public.agreement_template_versions add constraint agreement_template_versions_pkey PRIMARY KEY (id);
alter table public.agreement_template_versions add constraint agreement_template_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'under_review'::text, 'approved'::text, 'superseded'::text])));
alter table public.agreement_template_versions add constraint agreement_template_versions_template_id_version_key UNIQUE (template_id, version);
alter table public.agreement_template_versions add constraint agreement_template_versions_version_check CHECK ((version > 0));
alter table public.agreement_templates add constraint agreement_templates_kind_check CHECK ((kind = ANY (ARRAY['employment'::text, 'self_employed'::text, 'au_pair'::text, 'babysitter'::text, 'live_in'::text, 'other'::text])));
alter table public.agreement_templates add constraint agreement_templates_kind_jurisdiction_language_key UNIQUE (kind, jurisdiction, language);
alter table public.agreement_templates add constraint agreement_templates_pkey PRIMARY KEY (id);
alter table public.agreement_versions add constraint agreement_versions_agreement_id_version_key UNIQUE (agreement_id, version);
alter table public.agreement_versions add constraint agreement_versions_pkey PRIMARY KEY (id);
alter table public.audit_log add constraint audit_log_actor_kind_check CHECK ((actor_kind = ANY (ARRAY['owner'::text, 'agency_staff'::text, 'parent'::text, 'nanny'::text, 'system'::text, 'webhook'::text])));
alter table public.audit_log add constraint audit_log_pkey PRIMARY KEY (id);
alter table public.care_events add constraint care_events_amount_ml_check CHECK (((amount_ml IS NULL) OR ((amount_ml > 0) AND (amount_ml <= 1000))));
alter table public.care_events add constraint care_events_kind_check CHECK ((kind = ANY (ARRAY['nap'::text, 'bottle'::text, 'meal'::text, 'nappy'::text, 'potty'::text])));
alter table public.care_events add constraint care_events_pkey PRIMARY KEY (id);
alter table public.challenge_completions add constraint challenge_completions_challenge_id_family_id_key UNIQUE (challenge_id, family_id);
alter table public.challenge_completions add constraint challenge_completions_pkey PRIMARY KEY (id);
alter table public.challenge_recipients add constraint challenge_recipients_challenge_id_family_id_key UNIQUE (challenge_id, family_id);
alter table public.challenge_recipients add constraint challenge_recipients_pkey PRIMARY KEY (id);
alter table public.cover_requests add constraint cover_requests_pkey PRIMARY KEY (id);
alter table public.daily_logs add constraint daily_logs_pkey PRIMARY KEY (id);
alter table public.deleted_households add constraint deleted_households_pkey PRIMARY KEY (family_id);
alter table public.document_signatures add constraint document_signatures_pkey PRIMARY KEY (id);
alter table public.expense_claims add constraint expense_claims_amount_check CHECK (((amount >= (0)::numeric) AND (amount <= (10000)::numeric)));
alter table public.expense_claims add constraint expense_claims_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
alter table public.expense_claims add constraint expense_claims_pkey PRIMARY KEY (id);
alter table public.expense_claims add constraint expense_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reimbursed'::text, 'declined'::text])));
alter table public.expense_claims add constraint expense_claims_submitted_by_check CHECK ((submitted_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.families add constraint families_agreement_choice_check CHECK ((agreement_choice = ANY (ARRAY['template'::text, 'self_employed'::text, 'none'::text])));
alter table public.families add constraint families_agreement_policy_check CHECK ((agreement_policy = ANY (ARRAY['family'::text, 'on'::text, 'off'::text])));
alter table public.families add constraint families_country_check CHECK (((char_length(country) >= 2) AND (char_length(country) <= 5)));
alter table public.families add constraint families_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
alter table public.families add constraint families_entitlement_check CHECK ((entitlement = ANY (ARRAY['agency_active'::text, 'transition'::text, 'direct_active'::text, 'suspended'::text])));
alter table public.families add constraint families_pkey PRIMARY KEY (id);
alter table public.families add constraint families_slug_key UNIQUE (slug);
alter table public.family_children add constraint family_children_pkey PRIMARY KEY (id);
alter table public.family_contacts add constraint family_contacts_pkey PRIMARY KEY (id);
alter table public.family_documents add constraint family_documents_family_id_doc_type_key UNIQUE (family_id, doc_type);
alter table public.family_documents add constraint family_documents_pkey PRIMARY KEY (id);
alter table public.family_moments add constraint family_moments_kind_check CHECK ((kind = ANY (ARRAY['photo'::text, 'milestone'::text])));
alter table public.family_moments add constraint family_moments_pkey PRIMARY KEY (id);
alter table public.family_nannies add constraint family_nannies_pkey PRIMARY KEY (id);
alter table public.family_nannies add constraint family_nannies_role_check CHECK ((role = ANY (ARRAY['nanny'::text, 'au_pair'::text, 'maternity_nurse'::text, 'housekeeper'::text, 'cook'::text, 'driver'::text, 'personal_assistant'::text, 'tutor'::text, 'other'::text])));
alter table public.family_profile add constraint family_profile_family_id_key UNIQUE (family_id);
alter table public.family_profile add constraint family_profile_pkey PRIMARY KEY (id);
alter table public.family_services add constraint family_services_curation_status_check CHECK ((curation_status = ANY (ARRAY['not_started'::text, 'brief_received'::text, 'search_underway'::text, 'shortlist_sent'::text, 'interviews'::text, 'placement_made'::text, 'paused'::text])));
alter table public.family_services add constraint family_services_family_id_key UNIQUE (family_id);
alter table public.family_services add constraint family_services_payroll_status_check CHECK ((payroll_status = ANY (ARRAY['not_started'::text, 'details_needed'::text, 'introduction_requested'::text, 'setup_in_progress'::text, 'payroll_ready'::text])));
alter table public.family_services add constraint family_services_pkey PRIMARY KEY (id);
alter table public.family_subscriptions add constraint family_subscriptions_billing_interval_check CHECK ((billing_interval = ANY (ARRAY['month'::text, 'year'::text])));
alter table public.family_subscriptions add constraint family_subscriptions_environment_check CHECK ((environment = ANY (ARRAY['sandbox'::text, 'live'::text])));
alter table public.family_subscriptions add constraint family_subscriptions_pkey PRIMARY KEY (id);
alter table public.family_subscriptions add constraint family_subscriptions_plan_check CHECK ((plan = ANY (ARRAY['family'::text, 'household'::text, 'agency_partner'::text, 'agency_growth'::text, 'agency_scale'::text])));
alter table public.family_subscriptions add constraint family_subscriptions_stripe_checkout_session_id_key UNIQUE (stripe_checkout_session_id);
alter table public.family_subscriptions add constraint family_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
alter table public.handover_checklists add constraint handover_checklists_pkey PRIMARY KEY (id);
alter table public.handover_checklists add constraint handover_checklists_submitted_by_check CHECK ((submitted_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.house_manual_entries add constraint house_manual_entries_category_check CHECK ((category = ANY (ARRAY['access'::text, 'emergencies'::text, 'rules'::text, 'appliances'::text])));
alter table public.house_manual_entries add constraint house_manual_entries_notes_check CHECK ((char_length(notes) <= 4000));
alter table public.house_manual_entries add constraint house_manual_entries_pkey PRIMARY KEY (id);
alter table public.house_manual_entries add constraint house_manual_entries_secret_value_check CHECK ((char_length(secret_value) <= 500));
alter table public.house_manual_entries add constraint house_manual_entries_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100)));
alter table public.household_members add constraint household_members_family_id_person_id_key UNIQUE (family_id, person_id);
alter table public.household_members add constraint household_members_nanny_id_key UNIQUE (nanny_id);
alter table public.household_members add constraint household_members_pkey PRIMARY KEY (id);
alter table public.household_members add constraint household_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'co_parent'::text, 'staff'::text])));
alter table public.household_members add constraint household_members_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'revoked'::text, 'ended'::text])));
alter table public.household_messages add constraint household_messages_pkey PRIMARY KEY (id);
alter table public.household_permissions add constraint household_permissions_answer_check CHECK ((answer = ANY (ARRAY['yes'::text, 'no'::text, 'ask_first'::text])));
alter table public.household_permissions add constraint household_permissions_category_check CHECK ((category = ANY (ARRAY['health'::text, 'outdoors'::text, 'digital'::text, 'travel'::text, 'collection'::text, 'other'::text])));
alter table public.household_permissions add constraint household_permissions_family_id_permission_key_key UNIQUE (family_id, permission_key);
alter table public.household_permissions add constraint household_permissions_label_check CHECK (((char_length(label) >= 1) AND (char_length(label) <= 120)));
alter table public.household_permissions add constraint household_permissions_note_check CHECK ((char_length(note) <= 1000));
alter table public.household_permissions add constraint household_permissions_permission_key_check CHECK (((char_length(permission_key) >= 1) AND (char_length(permission_key) <= 80)));
alter table public.household_permissions add constraint household_permissions_pkey PRIMARY KEY (id);
alter table public.household_threads add constraint household_threads_pkey PRIMARY KEY (id);
alter table public.incident_reports add constraint incident_reports_action_taken_check CHECK ((char_length(action_taken) <= 2000));
alter table public.incident_reports add constraint incident_reports_child_name_check CHECK (((char_length(child_name) >= 1) AND (char_length(child_name) <= 120)));
alter table public.incident_reports add constraint incident_reports_kind_check CHECK ((kind = ANY (ARRAY['accident'::text, 'near_miss'::text, 'behaviour'::text, 'illness'::text, 'other'::text])));
alter table public.incident_reports add constraint incident_reports_pkey PRIMARY KEY (id);
alter table public.incident_reports add constraint incident_reports_reported_by_check CHECK ((reported_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.incident_reports add constraint incident_reports_severity_check CHECK ((severity = ANY (ARRAY['minor'::text, 'needed_first_aid'::text, 'needed_medical_help'::text])));
alter table public.incident_reports add constraint incident_reports_what_happened_check CHECK (((char_length(what_happened) >= 1) AND (char_length(what_happened) <= 2000)));
alter table public.kids_playbook_entries add constraint kids_playbook_entries_added_by_check CHECK ((added_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.kids_playbook_entries add constraint kids_playbook_entries_category_check CHECK ((category = ANY (ARRAY['comfort'::text, 'handle'::text, 'friends'::text, 'activities'::text])));
alter table public.kids_playbook_entries add constraint kids_playbook_entries_child_name_check CHECK ((char_length(child_name) <= 60));
alter table public.kids_playbook_entries add constraint kids_playbook_entries_notes_check CHECK ((char_length(notes) <= 4000));
alter table public.kids_playbook_entries add constraint kids_playbook_entries_pkey PRIMARY KEY (id);
alter table public.kids_playbook_entries add constraint kids_playbook_entries_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 100)));
alter table public.leave_requests add constraint leave_requests_pkey PRIMARY KEY (id);
alter table public.live_in_settings add constraint live_in_settings_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
alter table public.live_in_settings add constraint live_in_settings_pkey PRIMARY KEY (family_id);
alter table public.live_in_weeks add constraint live_in_weeks_family_id_week_start_key UNIQUE (family_id, week_start);
alter table public.live_in_weeks add constraint live_in_weeks_pkey PRIMARY KEY (id);
alter table public.medication_doses add constraint medication_doses_pkey PRIMARY KEY (id);
alter table public.moment_reactions add constraint moment_reactions_by_role_check CHECK ((by_role = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.moment_reactions add constraint moment_reactions_pkey PRIMARY KEY (moment_id, by_role);
alter table public.nanny_agreements add constraint nanny_agreements_family_id_key UNIQUE (family_id);
alter table public.nanny_agreements add constraint nanny_agreements_pkey PRIMARY KEY (id);
alter table public.nanny_bank_details add constraint nanny_bank_details_family_id_nanny_id_key UNIQUE (family_id, nanny_id);
alter table public.nanny_bank_details add constraint nanny_bank_details_pkey PRIMARY KEY (id);
alter table public.nanny_safety_documents add constraint nanny_safety_documents_document_type_check CHECK ((document_type = ANY (ARRAY['dbs'::text, 'first_aid'::text, 'right_to_work'::text, 'reference_1'::text, 'reference_2'::text, 'public_liability'::text])));
alter table public.nanny_safety_documents add constraint nanny_safety_documents_nanny_id_document_type_key UNIQUE (nanny_id, document_type);
alter table public.nanny_safety_documents add constraint nanny_safety_documents_pkey PRIMARY KEY (id);
alter table public.nanny_safety_documents add constraint nanny_safety_documents_visibility_check CHECK ((visibility = ANY (ARRAY['document'::text, 'badge'::text, 'hidden'::text])));
alter table public.nanny_work_hours add constraint nanny_work_hours_nanny_id_key UNIQUE (nanny_id);
alter table public.nanny_work_hours add constraint nanny_work_hours_pkey PRIMARY KEY (id);
alter table public.partner_agencies add constraint partner_agencies_household_allowance_check CHECK (((household_allowance IS NULL) OR (household_allowance >= 0)));
alter table public.partner_agencies add constraint partner_agencies_logo_size CHECK (((logo_data IS NULL) OR ((length(logo_data) <= 400000) AND (logo_data ~~ 'data:image/%'::text))));
alter table public.partner_agencies add constraint partner_agencies_pkey PRIMARY KEY (id);
alter table public.partner_agencies add constraint partner_agencies_plan_check CHECK ((plan = ANY (ARRAY['partner'::text, 'growth'::text, 'scale'::text, 'enterprise'::text])));
alter table public.partner_agency_staff add constraint partner_agency_staff_email_key UNIQUE (email);
alter table public.partner_agency_staff add constraint partner_agency_staff_pkey PRIMARY KEY (id);
alter table public.partner_perks add constraint partner_perks_pkey PRIMARY KEY (id);
alter table public.people add constraint people_pkey PRIMARY KEY (id);
alter table public.people add constraint people_user_id_key UNIQUE (user_id);
alter table public.petty_cash_entries add constraint petty_cash_entries_amount_check CHECK ((amount > (0)::numeric));
alter table public.petty_cash_entries add constraint petty_cash_entries_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
alter table public.petty_cash_entries add constraint petty_cash_entries_kind_check CHECK ((kind = ANY (ARRAY['topup'::text, 'spend'::text])));
alter table public.petty_cash_entries add constraint petty_cash_entries_pkey PRIMARY KEY (id);
alter table public.planner_entries add constraint planner_entries_approval_check CHECK ((approval = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text])));
alter table public.planner_entries add constraint planner_entries_pkey PRIMARY KEY (id);
alter table public.playbook_reads add constraint playbook_reads_pkey PRIMARY KEY (id);
alter table public.playbook_reads add constraint playbook_reads_playbook_id_family_id_reader_role_key UNIQUE (playbook_id, family_id, reader_role);
alter table public.playbook_recipients add constraint playbook_recipients_pkey PRIMARY KEY (id);
alter table public.playbook_recipients add constraint playbook_recipients_playbook_id_family_id_key UNIQUE (playbook_id, family_id);
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key UNIQUE (endpoint);
alter table public.push_subscriptions add constraint push_subscriptions_pkey PRIMARY KEY (id);
alter table public.push_subscriptions add constraint push_subscriptions_quiet_end_check CHECK (((quiet_end >= 0) AND (quiet_end <= 23)));
alter table public.push_subscriptions add constraint push_subscriptions_quiet_start_check CHECK (((quiet_start >= 0) AND (quiet_start <= 23)));
alter table public.push_subscriptions add constraint push_subscriptions_role_check CHECK ((role = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.review_checkins add constraint review_checkins_pkey PRIMARY KEY (id);
alter table public.saved_resources add constraint saved_resources_pkey PRIMARY KEY (id);
alter table public.seasonal_playbooks add constraint seasonal_playbooks_pkey PRIMARY KEY (id);
alter table public.shift_sessions add constraint shift_sessions_break_minutes_check CHECK (((break_minutes >= 0) AND (break_minutes <= 720)));
alter table public.shift_sessions add constraint shift_sessions_pkey PRIMARY KEY (id);
alter table public.signing_codes add constraint signing_codes_pkey PRIMARY KEY (id);
alter table public.signing_codes add constraint signing_codes_signer_role_check CHECK ((signer_role = ANY (ARRAY['parent'::text, 'nanny'::text])));
alter table public.sports_passport_entries add constraint sports_passport_entries_confidence_level_check CHECK (((confidence_level >= 1) AND (confidence_level <= 5)));
alter table public.sports_passport_entries add constraint sports_passport_entries_effort_level_check CHECK (((effort_level >= 1) AND (effort_level <= 5)));
alter table public.sports_passport_entries add constraint sports_passport_entries_logged_by_check CHECK ((logged_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.sports_passport_entries add constraint sports_passport_entries_minutes_check CHECK (((minutes >= 0) AND (minutes <= 600)));
alter table public.sports_passport_entries add constraint sports_passport_entries_pkey PRIMARY KEY (id);
alter table public.support_messages add constraint support_messages_pkey PRIMARY KEY (id);
alter table public.support_threads add constraint support_threads_pkey PRIMARY KEY (id);
alter table public.timesheet_shifts add constraint timesheet_shifts_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text));
alter table public.timesheet_shifts add constraint timesheet_shifts_pkey PRIMARY KEY (id);
alter table public.timesheet_shifts add constraint timesheet_shifts_shift_type_check CHECK ((shift_type = ANY (ARRAY['nanny'::text, 'babysitting'::text])));
alter table public.training_attempts add constraint training_attempts_pkey PRIMARY KEY (id);
alter table public.travel_trips add constraint travel_trips_pkey PRIMARY KEY (id);
alter table public.user_roles add constraint user_roles_pkey PRIMARY KEY (id);
alter table public.user_roles add constraint user_roles_user_id_role_key UNIQUE (user_id, role);
alter table public.wallet_access_attempts add constraint wallet_access_attempts_pkey PRIMARY KEY (id);
alter table public.wallet_activity add constraint wallet_activity_actor_check CHECK ((actor = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.wallet_activity add constraint wallet_activity_pkey PRIMARY KEY (id);
alter table public.wallet_documents add constraint wallet_documents_pkey PRIMARY KEY (id);
alter table public.wallet_documents add constraint wallet_documents_size_bytes_check CHECK ((size_bytes > 0));
alter table public.wallet_documents add constraint wallet_documents_storage_path_key UNIQUE (storage_path);
alter table public.wallet_documents add constraint wallet_documents_uploaded_by_check CHECK ((uploaded_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.wallet_pair_pins add constraint wallet_pair_pins_pkey PRIMARY KEY (id);
alter table public.wallet_seen add constraint wallet_seen_pkey PRIMARY KEY (family_id, role, feature);
alter table public.wallet_seen add constraint wallet_seen_role_check CHECK ((role = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.welcome_checkins add constraint welcome_checkins_confirmed_by_check CHECK ((confirmed_by = ANY (ARRAY['family'::text, 'nanny'::text])));
alter table public.welcome_checkins add constraint welcome_checkins_family_id_nanny_id_step_id_confirmed_by_key UNIQUE (family_id, nanny_id, step_id, confirmed_by);
alter table public.welcome_checkins add constraint welcome_checkins_pkey PRIMARY KEY (id);
alter table public.welcome_progress add constraint welcome_progress_pkey PRIMARY KEY (family_id);

-- Foreign keys
alter table public.account_claims add constraint account_claims_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.household_members(id) ON DELETE CASCADE;
alter table public.agency_challenges add constraint agency_challenges_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
alter table public.agency_invites add constraint agency_invites_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
alter table public.agency_invites add constraint agency_invites_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE SET NULL;
alter table public.agency_terms add constraint agency_terms_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
alter table public.agreement_template_versions add constraint agreement_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.agreement_templates(id) ON DELETE RESTRICT;
alter table public.agreement_versions add constraint agreement_versions_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.nanny_agreements(id) ON DELETE RESTRICT;
alter table public.agreement_versions add constraint agreement_versions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.agreement_versions add constraint agreement_versions_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.agreement_versions add constraint agreement_versions_template_version_id_fkey FOREIGN KEY (template_version_id) REFERENCES public.agreement_template_versions(id) ON DELETE RESTRICT;
alter table public.care_events add constraint care_events_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.family_children(id) ON DELETE SET NULL;
alter table public.care_events add constraint care_events_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.challenge_completions add constraint challenge_completions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.agency_challenges(id) ON DELETE CASCADE;
alter table public.challenge_completions add constraint challenge_completions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.challenge_recipients add constraint challenge_recipients_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.agency_challenges(id) ON DELETE CASCADE;
alter table public.challenge_recipients add constraint challenge_recipients_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.cover_requests add constraint cover_requests_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.cover_requests add constraint cover_requests_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.support_threads(id) ON DELETE SET NULL;
alter table public.daily_logs add constraint daily_logs_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.document_signatures add constraint document_signatures_agreement_version_id_fkey FOREIGN KEY (agreement_version_id) REFERENCES public.agreement_versions(id) ON DELETE RESTRICT;
alter table public.document_signatures add constraint document_signatures_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.document_signatures add constraint document_signatures_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.expense_claims add constraint expense_claims_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.expense_claims add constraint expense_claims_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.families add constraint families_partner_agency_id_fkey FOREIGN KEY (partner_agency_id) REFERENCES public.partner_agencies(id) ON DELETE RESTRICT;
alter table public.family_children add constraint family_children_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_contacts add constraint family_contacts_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_documents add constraint family_documents_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_moments add constraint family_moments_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.family_children(id) ON DELETE SET NULL;
alter table public.family_moments add constraint family_moments_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_moments add constraint family_moments_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.family_nannies add constraint family_nannies_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_profile add constraint family_profile_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_services add constraint family_services_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.family_subscriptions add constraint family_subscriptions_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE SET NULL;
alter table public.family_subscriptions add constraint family_subscriptions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE SET NULL;
alter table public.handover_checklists add constraint handover_checklists_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.handover_checklists add constraint handover_checklists_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.house_manual_entries add constraint house_manual_entries_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.household_members add constraint household_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.household_members add constraint household_members_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.household_members add constraint household_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE RESTRICT;
alter table public.household_members add constraint household_members_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.people(id);
alter table public.household_messages add constraint household_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.household_threads(id) ON DELETE CASCADE;
alter table public.household_permissions add constraint household_permissions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.household_threads add constraint household_threads_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.incident_reports add constraint incident_reports_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.kids_playbook_entries add constraint kids_playbook_entries_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.leave_requests add constraint leave_requests_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.leave_requests add constraint leave_requests_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.live_in_settings add constraint live_in_settings_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.live_in_weeks add constraint live_in_weeks_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.medication_doses add constraint medication_doses_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.moment_reactions add constraint moment_reactions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.moment_reactions add constraint moment_reactions_moment_id_fkey FOREIGN KEY (moment_id) REFERENCES public.family_moments(id) ON DELETE CASCADE;
alter table public.nanny_agreements add constraint nanny_agreements_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.nanny_agreements add constraint nanny_agreements_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.nanny_bank_details add constraint nanny_bank_details_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.nanny_bank_details add constraint nanny_bank_details_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.nanny_safety_documents add constraint nanny_safety_documents_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.nanny_safety_documents add constraint nanny_safety_documents_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.nanny_work_hours add constraint nanny_work_hours_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.nanny_work_hours add constraint nanny_work_hours_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.partner_agency_staff add constraint partner_agency_staff_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
alter table public.partner_perks add constraint partner_perks_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
alter table public.people add constraint people_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.petty_cash_entries add constraint petty_cash_entries_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.planner_entries add constraint planner_entries_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.playbook_reads add constraint playbook_reads_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.playbook_reads add constraint playbook_reads_playbook_id_fkey FOREIGN KEY (playbook_id) REFERENCES public.seasonal_playbooks(id) ON DELETE CASCADE;
alter table public.playbook_recipients add constraint playbook_recipients_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.playbook_recipients add constraint playbook_recipients_playbook_id_fkey FOREIGN KEY (playbook_id) REFERENCES public.seasonal_playbooks(id) ON DELETE CASCADE;
alter table public.push_subscriptions add constraint push_subscriptions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.review_checkins add constraint review_checkins_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.review_checkins add constraint review_checkins_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.review_checkins add constraint review_checkins_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.support_threads(id) ON DELETE SET NULL;
alter table public.saved_resources add constraint saved_resources_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.seasonal_playbooks add constraint seasonal_playbooks_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.partner_agencies(id) ON DELETE CASCADE;
alter table public.shift_sessions add constraint shift_sessions_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.shift_sessions add constraint shift_sessions_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.signing_codes add constraint signing_codes_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.sports_passport_entries add constraint sports_passport_entries_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.support_messages add constraint support_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.support_threads(id) ON DELETE CASCADE;
alter table public.support_threads add constraint support_threads_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.timesheet_shifts add constraint timesheet_shifts_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.training_attempts add constraint training_attempts_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.travel_trips add constraint travel_trips_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.wallet_activity add constraint wallet_activity_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.wallet_documents add constraint wallet_documents_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.wallet_documents add constraint wallet_documents_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.wallet_documents add constraint wallet_documents_uploaded_by_nanny_id_fkey FOREIGN KEY (uploaded_by_nanny_id) REFERENCES public.family_nannies(id) ON DELETE SET NULL;
alter table public.wallet_seen add constraint wallet_seen_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.welcome_checkins add constraint welcome_checkins_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;
alter table public.welcome_checkins add constraint welcome_checkins_nanny_id_fkey FOREIGN KEY (nanny_id) REFERENCES public.family_nannies(id) ON DELETE CASCADE;
alter table public.welcome_progress add constraint welcome_progress_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX agency_challenges_agency_idx ON public.agency_challenges USING btree (agency_id);
CREATE UNIQUE INDEX agency_invites_code ON public.agency_invites USING btree (code_hash) WHERE (code_hash IS NOT NULL);
CREATE INDEX agency_invites_family ON public.agency_invites USING btree (family_id);
CREATE UNIQUE INDEX agency_invites_open_slot ON public.agency_invites USING btree (agency_id, slot) WHERE (status = ANY (ARRAY['pending'::text, 'accepted'::text]));
CREATE UNIQUE INDEX agency_invites_pending_email ON public.agency_invites USING btree (agency_id, lower(email)) WHERE (status = 'pending'::text);
CREATE UNIQUE INDEX agency_invites_token ON public.agency_invites USING btree (token_hash) WHERE (token_hash IS NOT NULL);
CREATE UNIQUE INDEX agency_terms_agency_key ON public.agency_terms USING btree (COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX agreement_versions_family ON public.agreement_versions USING btree (family_id);
CREATE INDEX audit_log_agency_at ON public.audit_log USING btree (agency_id, at DESC);
CREATE INDEX audit_log_family_at ON public.audit_log USING btree (family_id, at DESC);
CREATE INDEX care_events_family_time_idx ON public.care_events USING btree (family_id, started_at DESC);
CREATE INDEX cover_requests_family_idx ON public.cover_requests USING btree (family_id, start_date DESC);
CREATE INDEX daily_logs_family_date_idx ON public.daily_logs USING btree (family_id, log_date DESC);
CREATE INDEX document_signatures_family_idx ON public.document_signatures USING btree (family_id, doc_kind);
CREATE INDEX document_signatures_nanny_id_idx ON public.document_signatures USING btree (nanny_id);
CREATE INDEX expense_claims_family_date_idx ON public.expense_claims USING btree (family_id, expense_date DESC);
CREATE INDEX expense_claims_family_status_idx ON public.expense_claims USING btree (family_id, status);
CREATE INDEX families_last_active_idx ON public.families USING btree (partner_agency_id, last_active_at);
CREATE INDEX families_partner_agency_id_idx ON public.families USING btree (partner_agency_id);
CREATE INDEX family_children_family_idx ON public.family_children USING btree (family_id, sort_order);
CREATE INDEX family_moments_family_date_idx ON public.family_moments USING btree (family_id, moment_date DESC);
CREATE INDEX family_nannies_family_id_idx ON public.family_nannies USING btree (family_id);
CREATE INDEX family_services_family_id_idx ON public.family_services USING btree (family_id);
CREATE INDEX family_subscriptions_agency_idx ON public.family_subscriptions USING btree (agency_id);
CREATE INDEX family_subscriptions_customer_idx ON public.family_subscriptions USING btree (stripe_customer_id);
CREATE INDEX family_subscriptions_family_idx ON public.family_subscriptions USING btree (family_id);
CREATE INDEX handover_checklists_family_date_idx ON public.handover_checklists USING btree (family_id, handover_date DESC);
CREATE INDEX house_manual_family_category ON public.house_manual_entries USING btree (family_id, category);
CREATE INDEX household_members_family ON public.household_members USING btree (family_id);
CREATE INDEX household_members_person ON public.household_members USING btree (person_id) WHERE (person_id IS NOT NULL);
CREATE INDEX household_messages_thread_idx ON public.household_messages USING btree (thread_id, created_at);
CREATE INDEX household_permissions_family_idx ON public.household_permissions USING btree (family_id, category);
CREATE INDEX household_threads_family_idx ON public.household_threads USING btree (family_id, updated_at DESC);
CREATE INDEX incident_reports_family_idx ON public.incident_reports USING btree (family_id, occurred_at DESC);
CREATE INDEX kids_playbook_family ON public.kids_playbook_entries USING btree (family_id, category);
CREATE INDEX leave_requests_family_idx ON public.leave_requests USING btree (family_id, start_date);
CREATE INDEX leave_requests_nanny_idx ON public.leave_requests USING btree (nanny_id);
CREATE INDEX medication_doses_family_given_idx ON public.medication_doses USING btree (family_id, given_at DESC);
CREATE INDEX nanny_agreements_nanny_id_idx ON public.nanny_agreements USING btree (nanny_id);
CREATE INDEX nanny_safety_documents_family_id_idx ON public.nanny_safety_documents USING btree (family_id);
CREATE INDEX nanny_safety_documents_nanny_id_idx ON public.nanny_safety_documents USING btree (nanny_id);
CREATE INDEX nanny_work_hours_family_idx ON public.nanny_work_hours USING btree (family_id);
CREATE UNIQUE INDEX partner_agencies_short_name_key ON public.partner_agencies USING btree (lower(short_name)) WHERE (short_name IS NOT NULL);
CREATE INDEX partner_perks_agency_idx ON public.partner_perks USING btree (agency_id);
CREATE INDEX partner_perks_published_idx ON public.partner_perks USING btree (is_published, sort_order);
CREATE INDEX petty_cash_family_date_idx ON public.petty_cash_entries USING btree (family_id, entry_date DESC);
CREATE INDEX planner_entries_family_date_idx ON public.planner_entries USING btree (family_id, entry_date);
CREATE INDEX planner_entries_family_date_kind_idx ON public.planner_entries USING btree (family_id, entry_date, entry_type);
CREATE INDEX playbook_reads_family_idx ON public.playbook_reads USING btree (family_id);
CREATE INDEX playbook_recipients_family_idx ON public.playbook_recipients USING btree (family_id);
CREATE INDEX push_subscriptions_family_idx ON public.push_subscriptions USING btree (family_id);
CREATE INDEX review_checkins_family_idx ON public.review_checkins USING btree (family_id, created_at DESC);
CREATE INDEX saved_resources_family_type_idx ON public.saved_resources USING btree (family_id, resource_type, created_at DESC);
CREATE INDEX seasonal_playbooks_agency_idx ON public.seasonal_playbooks USING btree (agency_id);
CREATE INDEX seasonal_playbooks_published_idx ON public.seasonal_playbooks USING btree (is_published, published_at DESC);
CREATE INDEX shift_sessions_family_idx ON public.shift_sessions USING btree (family_id, started_at DESC);
CREATE UNIQUE INDEX shift_sessions_one_open ON public.shift_sessions USING btree (nanny_id) WHERE (ended_at IS NULL);
CREATE INDEX signing_codes_lookup ON public.signing_codes USING btree (family_id, signer_role, email, created_at DESC);
CREATE INDEX sports_passport_entries_family_date_idx ON public.sports_passport_entries USING btree (family_id, entry_date DESC);
CREATE INDEX support_messages_thread_idx ON public.support_messages USING btree (thread_id, created_at);
CREATE INDEX support_threads_family_idx ON public.support_threads USING btree (family_id, updated_at DESC);
CREATE INDEX timesheet_shifts_family_date_idx ON public.timesheet_shifts USING btree (family_id, shift_date DESC);
CREATE INDEX training_attempts_family_idx ON public.training_attempts USING btree (family_id, completed_at DESC);
CREATE UNIQUE INDEX training_attempts_ref_idx ON public.training_attempts USING btree (certificate_ref);
CREATE INDEX travel_trips_family_idx ON public.travel_trips USING btree (family_id, start_date);
CREATE INDEX wallet_access_attempts_lookup ON public.wallet_access_attempts USING btree (client_key, attempted_at DESC);
CREATE INDEX wallet_activity_family_time_idx ON public.wallet_activity USING btree (family_id, created_at DESC);
CREATE INDEX wallet_documents_family_idx ON public.wallet_documents USING btree (family_id, created_at DESC);
CREATE INDEX wallet_pair_pins_slug_idx ON public.wallet_pair_pins USING btree (slug);
CREATE INDEX welcome_checkins_family_nanny_idx ON public.welcome_checkins USING btree (family_id, nanny_id);

-- Functions
CREATE OR REPLACE FUNCTION public.families_lock_clock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status in ('suspended', 'cancelled') and old.status = 'active' then
    new.locked_at := now();
    new.delete_after := now() + interval '30 days';
    new.deletion_notices := '[]'::jsonb;
    new.deletion_confirmed := false;
  elsif new.status = 'active' and old.status in ('suspended', 'cancelled') then
    new.locked_at := null;
    new.delete_after := null;
    new.deletion_notices := '[]'::jsonb;
    new.deletion_confirmed := false;
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.freeze_approved_template()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.status in ('approved', 'superseded') then
    if old.status = 'approved' and new.status = 'superseded'
       and new.body = old.body and new.version = old.version and new.template_id = old.template_id
       and new.reviewer_name is not distinct from old.reviewer_name and new.reviewed_at is not distinct from old.reviewed_at then
      return new;
    end if;
    raise exception 'An approved agreement template version cannot be edited. Make a new version instead.';
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.get_partner_brand(_handle text)
 RETURNS TABLE(handle text, wallet_name text, agency_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT lower(short_name), COALESCE(NULLIF(trim(brand_name), ''), name), name
  FROM public.partner_agencies
  WHERE short_name IS NOT NULL AND lower(short_name) = lower(_handle) AND status = 'active'
  LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.get_partner_logo(_handle text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT logo_data FROM public.partner_agencies
  WHERE short_name IS NOT NULL AND lower(short_name) = lower(_handle) AND status = 'active' LIMIT 1
$function$
;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$function$
;
CREATE OR REPLACE FUNCTION public.is_household_member(_family uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_household_owner(_family) or public.my_staff_nanny(_family) is not null
$function$
;
CREATE OR REPLACE FUNCTION public.is_household_owner(_family uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.household_members m join public.people p on p.id = m.person_id
    where m.family_id = _family and p.user_id = auth.uid() and m.status = 'active' and m.role in ('owner', 'co_parent')
  )
$function$
;
CREATE OR REPLACE FUNCTION public.my_staff_nanny(_family uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.nanny_id from public.household_members m join public.people p on p.id = m.person_id
  where m.family_id = _family and p.user_id = auth.uid() and m.status = 'active' and m.role = 'staff'
  limit 1
$function$
;
CREATE OR REPLACE FUNCTION public.purge_family(_family uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare funded boolean;
begin
  select partner_agency_id is not null into funded from public.families where id = _family;
  if not found then raise exception 'That household does not exist.'; end if;

  delete from public.document_signatures where family_id = _family;
  delete from public.agreement_versions where family_id = _family;
  delete from public.nanny_agreements where family_id = _family;

  update public.agency_invites set email = 'deleted-' || substr(id::text, 1, 8) || '@seat.invalid', nanny_email = null, nanny_name = null where family_id = _family;
  update public.family_subscriptions set customer_email = null where family_id = _family;

  delete from public.families where id = _family;
  insert into public.deleted_households (family_id, reason, was_agency_funded) values (_family, _reason, coalesce(funded, false));
end $function$
;

-- Triggers
CREATE TRIGGER freeze_approved_template BEFORE UPDATE ON public.agreement_template_versions FOR EACH ROW EXECUTE FUNCTION public.freeze_approved_template();
CREATE TRIGGER families_lock_clock BEFORE UPDATE ON public.families FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.families_lock_clock();

-- Row level security: on for every table (live has none off)
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Policies (11 public, 2 storage)
create policy "Members read house manual" on public.house_manual_entries as PERMISSIVE for SELECT to authenticated using (public.is_household_member(family_id));
create policy "People read their own memberships" on public.household_members as PERMISSIVE for SELECT to authenticated using ((person_id IN ( SELECT people.id FROM public.people WHERE (people.user_id = auth.uid()))));
create policy "Members read incident reports" on public.incident_reports as PERMISSIVE for SELECT to authenticated using (public.is_household_member(family_id));
create policy "Members read bank details" on public.nanny_bank_details as PERMISSIVE for SELECT to authenticated using ((public.is_household_owner(family_id) OR (nanny_id = public.my_staff_nanny(family_id))));
create policy "Admins manage partner agencies" on public.partner_agencies as PERMISSIVE for ALL to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage partner agency staff" on public.partner_agency_staff as PERMISSIVE for ALL to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Admins manage partner perks" on public.partner_perks as PERMISSIVE for ALL to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "People read their own row" on public.people as PERMISSIVE for SELECT to authenticated using ((user_id = auth.uid()));
create policy "Admins manage seasonal playbooks" on public.seasonal_playbooks as PERMISSIVE for ALL to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "Users can read own roles" on public.user_roles as PERMISSIVE for SELECT to authenticated using ((auth.uid() = user_id));
create policy "Members read vault documents" on public.wallet_documents as PERMISSIVE for SELECT to authenticated using ((public.is_household_owner(family_id) OR ((public.my_staff_nanny(family_id) IS NOT NULL) AND ((nanny_id = public.my_staff_nanny(family_id)) OR ((nanny_id IS NULL) AND shared_with_staff)))));

-- Storage: one private bucket (25 MB limit) and its two policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('family-docs', 'family-docs', false, 26214400, null);
create policy "Admins manage family docs storage" on storage.objects as PERMISSIVE for ALL to authenticated using (((bucket_id = 'family-docs'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role))) with check (((bucket_id = 'family-docs'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
create policy "Members read their vault files" on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'family-docs'::text) AND (EXISTS ( SELECT 1 FROM public.wallet_documents d WHERE ((d.storage_path = objects.name) AND (public.is_household_owner(d.family_id) OR (d.shared_with_staff AND (public.my_staff_nanny(d.family_id) IS NOT NULL)) OR ((d.nanny_id IS NOT NULL) AND (d.nanny_id = public.my_staff_nanny(d.family_id)))))))));

-- Table grants, matching live (row level security still decides which rows anyone sees)
grant all on all tables in schema public to anon, authenticated, service_role;

commit;

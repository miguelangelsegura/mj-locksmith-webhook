-- Phase 4 — Customer login + per-tenant data isolation.
--
-- Links each Supabase Auth user to their shop row, adds the customer-editable
-- business-info columns, and turns on Row-Level Security so a signed-in customer
-- can read ONLY their own clients/calls rows. Service-role callers (the webhook,
-- billing, admin) have BYPASSRLS and are unaffected — they keep full access.

-- 1. Auth link + editable business-info columns ------------------------------
alter table clients add column if not exists auth_uid uuid references auth.users (id) on delete set null;
create unique index if not exists clients_auth_uid_key
  on clients (auth_uid) where auth_uid is not null;

alter table clients add column if not exists service_area text;
alter table clients add column if not exists services_offered text;
alter table clients add column if not exists pricing_notes text;

-- 2. Row-Level Security -------------------------------------------------------
-- Enabling RLS with NO permissive policy is default-deny: every role except the
-- BYPASSRLS service_role is refused all rows until a policy grants access.
alter table clients enable row level security;
alter table calls   enable row level security;

-- COLUMN-scoped read grants for the signed-in customer role. RLS gates WHICH rows
-- are visible; these grants gate WHICH columns. We deny the whole tables first, then
-- grant back only the customer-safe columns — so a customer can't `select('*')` their
-- OWN row to pull server-only secrets (onboarding_token is a capability token for the
-- Stripe/onboarding page; stripe ids, signed contract path, raw call payload). The
-- browser reads `calls` directly under RLS and reads `clients` only via the
-- service-role /me endpoint, so nothing here narrows what the app legitimately needs.
revoke all on clients from anon, authenticated;
revoke all on calls   from anon, authenticated;

grant select (
  id, business_name, agent_name, contact_email, dispatch_phone, fallback_number,
  cell_number, inbound_number, answer_mode, business_hours, timezone, service_area,
  services_offered, pricing_notes, provision_status, active, subscription_status,
  plan, created_at
) on clients to authenticated;

grant select (
  vapi_call_id, client_id, started_at, ended_at, duration_seconds, caller_phone,
  caller_name, service_address, door_type, damage_description, urgency, vehicle_info,
  outcome, summary, transcript, notified_at, notified_phone
) on calls to authenticated;

-- A customer reads only the shop row linked to their auth user.
drop policy if exists clients_select_own on clients;
create policy clients_select_own on clients
  for select to authenticated
  using (auth_uid = auth.uid());

-- A customer reads only calls belonging to their shop. The subquery is itself
-- filtered by clients' RLS to the same single row, so it resolves to the caller's
-- own client id — no cross-tenant leakage.
drop policy if exists calls_select_own on calls;
create policy calls_select_own on calls
  for select to authenticated
  using (client_id in (select id from clients where auth_uid = auth.uid()));

-- No INSERT/UPDATE/DELETE policies for `authenticated`: writes are default-denied
-- and must go through the service-role `dashboard` Edge Function, which validates
-- input and scopes every write to the caller's own row.

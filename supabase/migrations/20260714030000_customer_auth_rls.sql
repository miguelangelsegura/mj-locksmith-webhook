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

-- Explicit read grants for the signed-in customer role. RLS below still gates
-- WHICH rows are visible; without the grant the role sees the table at all.
grant select on clients to authenticated;
grant select on calls   to authenticated;

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

-- Fix: the calls RLS policy maps a call to its owner via a subquery into `clients`.
-- RLS policy subqueries into ANOTHER table are evaluated with the QUERYING user's
-- privileges, so that subquery needs SELECT on clients.auth_uid — which the
-- column-scoped grant in the prior migration intentionally withholds. The result is
-- fail-closed: a signed-in customer could read NONE of their own calls.
--
-- The Supabase-standard fix: a SECURITY DEFINER helper that resolves the caller's own
-- client id(s) with the function owner's privileges. The policy then needs no direct
-- grant on `clients` and exposes no extra columns to the customer.
create or replace function public.auth_client_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$ select id from public.clients where auth_uid = auth.uid() $$;

revoke all on function public.auth_client_ids() from public;
grant execute on function public.auth_client_ids() to authenticated;

drop policy if exists calls_select_own on calls;
create policy calls_select_own on calls
  for select to authenticated
  using (client_id in (select public.auth_client_ids()));

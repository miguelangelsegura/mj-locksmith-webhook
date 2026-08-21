-- One call = one statement. The lead row and its append-only history entry must
-- move together: writing them as two API calls meant a failed history insert
-- left `attempts` already incremented, so the operator's retry double-counted
-- the call and lost the first note. A plpgsql function runs in a single
-- transaction, so either both land or neither does.
--
-- `attempts` also increments in SQL rather than read-then-write: three people
-- work this list at once and two simultaneous calls would otherwise lose one.
create or replace function log_lead_event(
  p_lead_id uuid,
  p_patch jsonb,
  p_actor text,
  p_kind text,
  p_outcome text,
  p_note text
) returns leads
language plpgsql
as $$
declare
  result leads;
begin
  update leads set
    attempts = attempts + (case when p_kind = 'call' then 1 else 0 end),
    status = coalesce(p_patch->>'status', status),
    owner = case when p_patch ? 'owner' then p_patch->>'owner' else owner end,
    next_action_at = case when p_patch ? 'next_action_at'
      then nullif(p_patch->>'next_action_at', '')::date else next_action_at end,
    last_contacted_at = case when p_kind in ('call', 'email') then now() else last_contacted_at end
  where id = p_lead_id
  returning * into result;

  if result.id is null then
    return null;
  end if;

  insert into lead_activity (lead_id, actor, kind, outcome, note)
  values (p_lead_id, p_actor, p_kind, p_outcome, p_note);

  return result;
end;
$$;

revoke all on function log_lead_event(uuid, jsonb, text, text, text, text) from public, anon, authenticated;

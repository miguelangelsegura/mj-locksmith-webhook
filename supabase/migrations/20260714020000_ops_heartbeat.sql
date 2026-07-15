-- Single-row record of the external watchdog's last run, so the admin back office
-- can show "when did monitoring last check in?" (silence = the cron probe stopped,
-- which is itself a problem worth seeing). The scheduled heartbeat-monitor upserts
-- this row on every run; the admin /health endpoint reads it. Singleton (id = 1).
create table if not exists ops_heartbeat (
  id int primary key default 1,
  last_run_at timestamptz,
  last_ok boolean,
  last_problems text,
  constraint ops_heartbeat_singleton check (id = 1)
);

insert into ops_heartbeat (id, last_run_at) values (1, null)
  on conflict (id) do nothing;

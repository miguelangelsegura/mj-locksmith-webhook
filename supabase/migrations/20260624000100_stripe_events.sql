create table if not exists stripe_events (
  id text primary key,
  type text,
  received_at timestamptz not null default now()
);

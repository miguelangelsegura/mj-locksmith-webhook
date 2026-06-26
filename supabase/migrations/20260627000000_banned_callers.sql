create table if not exists banned_callers (
  caller_phone text primary key,
  reason text,
  created_at timestamptz not null default now()
);

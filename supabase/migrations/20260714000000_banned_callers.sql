-- Captures the `banned_callers` table (previously created out of band, live-only).
-- The webhook now enforces this list; admin `/banned` routes read/write it.
-- `if not exists` makes this a safe no-op against the existing live table.
create table if not exists banned_callers (
  id uuid primary key default gen_random_uuid(),
  caller_phone text not null unique,
  reason text,
  created_at timestamptz not null default now()
);

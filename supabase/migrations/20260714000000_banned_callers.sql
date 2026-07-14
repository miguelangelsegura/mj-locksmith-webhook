-- Captures the `banned_callers` table (previously created out of band, live-only).
-- The webhook now enforces this list; admin `/banned` routes read/write it.
-- Column set + PK verified against the live table (caller_phone is the natural key,
-- matching admin's upsert onConflict: "caller_phone"). `if not exists` = safe no-op live.
create table if not exists banned_callers (
  caller_phone text primary key,
  reason text,
  created_at timestamptz not null default now()
);

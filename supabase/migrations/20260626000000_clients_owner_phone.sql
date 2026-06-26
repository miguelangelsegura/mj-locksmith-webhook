-- Catch-up migration: `owner_phone` was added to the live `clients` table out of
-- band (no prior migration). Codify it so a fresh environment rebuilds correctly.
-- Inert against prod, where the column already exists as NOT NULL with no nulls.
alter table clients add column if not exists owner_phone text;

-- Backfill any legacy null rows before the NOT NULL set, so this can't fail on a
-- fresh/partial environment.
update clients
  set owner_phone = coalesce(owner_phone, dispatch_phone, '+10000000000')
  where owner_phone is null;

alter table clients alter column owner_phone set not null;

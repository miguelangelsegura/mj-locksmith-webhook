-- Shared outreach pipeline: prospect businesses we are selling Dispango TO.
-- Distinct from `clients` (shops already live on the product) and `calls`
-- (inbound calls their customers make). The `/locksmith-outreach` skill writes
-- rows here; the admin console's Leads tab is the team's call sheet.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),

  -- identity / dedup. `domain` is the natural key for a business we found on
  -- the web; `phone` covers shops with no site. Both are nullable but at least
  -- one must be present, and each is unique when set.
  business_name text not null,
  website text,
  domain text,
  phone text,
  city text,
  province text,
  trade text not null default 'locksmith',

  -- call-sheet payload (what you need in hand before dialling)
  hours text,
  timezone text,
  description text,
  contact_name text,

  -- email channel (secondary; the skill only fills these when drafting)
  email text,
  email_source_url text,
  email_status text not null default 'none'
    check (email_status in ('none','drafted','sent','replied','bounced')),
  drafted_at date,

  -- call pipeline
  status text not null default 'new'
    check (status in (
      'new','no_answer','voicemail','callback','reached','interested',
      'demo_booked','won','not_interested','bad_number','do_not_contact'
    )),
  owner text,
  next_action_at date,
  last_contacted_at timestamptz,
  attempts integer not null default 0,

  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_domain_key on leads (domain) where domain is not null;
create unique index if not exists leads_phone_key on leads (phone) where phone is not null;
create index if not exists leads_worklist_idx on leads (status, next_action_at, city);

-- Append-only activity log. Three people work the same list, so a free-text
-- `notes` column alone would let one person's edit clobber another's. Every
-- call/email outcome lands here as its own row and is never rewritten.
create table if not exists lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  actor text,
  kind text not null default 'call'
    check (kind in ('call','email','note','status')),
  outcome text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists lead_activity_lead_idx on lead_activity (lead_id, created_at desc);

create or replace function set_leads_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at before update on leads
  for each row execute function set_leads_updated_at();

-- Both tables are reached only through the admin Edge Function (service role,
-- x-admin-token gate). No anon/authenticated access.
alter table leads enable row level security;
alter table lead_activity enable row level security;

alter table clients add column if not exists contact_email text;

alter table clients add column if not exists onboarding_token text;

create unique index if not exists clients_onboarding_token_key
  on clients (onboarding_token) where onboarding_token is not null;

alter table clients add column if not exists contract_status text not null default 'none';
alter table clients drop constraint if exists clients_contract_status_check;
alter table clients add constraint clients_contract_status_check
  check (contract_status in ('none', 'sent', 'signed', 'declined'));

alter table clients add column if not exists contract_request_id text;
alter table clients add column if not exists signed_pdf_path text;
alter table clients add column if not exists signed_at timestamptz;

alter table clients add column if not exists stripe_customer_id text;
alter table clients add column if not exists stripe_subscription_id text;
alter table clients add column if not exists subscription_status text not null default 'none';
alter table clients drop constraint if exists clients_subscription_status_check;
alter table clients add constraint clients_subscription_status_check
  check (subscription_status in ('none', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete'));

alter table clients add column if not exists plan text;

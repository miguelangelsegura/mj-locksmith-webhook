-- Prevent duplicate self-serve signups for the same email. Partial index (nulls
-- allowed) so existing admin-created rows without a contact_email are unaffected —
-- same pattern as the onboarding_token index. Enables the 23505 dedupe catch in
-- the billing function's public /signup handler.
create unique index if not exists clients_contact_email_unique
  on public.clients (contact_email)
  where contact_email is not null;

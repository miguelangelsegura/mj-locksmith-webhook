-- Provisioning robot state. SEPARATE from `active` (owned solely by
-- recomputeActive = contract signed AND subscription paid). The robot buys a
-- Twilio number + wires Vapi on payment and marks the row 'staged'; the operator
-- taps Activate (→ 'active'). The webhook's inbound routing treats 'staged'/'error'
-- as NOT-yet-live, so a prepared-but-unconfirmed number forwards to the shop's
-- real phone (Vapi fallbackDestination) instead of answering.
--
--   none    legacy / manually-managed clients (routable — never robot-touched)
--   staged  robot prepared it; awaiting operator Activate (NOT live)
--   active  operator confirmed; live
--   error   Twilio bought but Vapi wiring failed — retryable (NOT live)
alter table clients add column if not exists provision_status text not null default 'none';
alter table clients drop constraint if exists clients_provision_status_check;
alter table clients add constraint clients_provision_status_check
  check (provision_status in ('none', 'staged', 'active', 'error'));

-- The shop's real phone, used as the Vapi number's fallbackDestination so a call
-- forwards to the locksmith if our server hiccups (or the number isn't live yet)
-- instead of dropping. Replaces the old hardcoded fallback.
alter table clients add column if not exists fallback_number text;

-- Human-readable last provisioning failure, surfaced in admin for the retry path.
alter table clients add column if not exists provision_error text;

-- At-most-once marker for the post-sign "set up payment" backstop email. The
-- billing function's SignWell document_completed webhook conditionally claims this
-- (update ... where payment_link_emailed_at is null) before sending, so a redelivered
-- or concurrent completion emails the payer exactly once. Deliberately keyed OFF
-- contract_status (which the /pay poll also sets) so the backstop still fires when
-- the browser redirect reached /pay, marked signed, then checkout failed/abandoned.
-- Internal ops column — NOT granted to authenticated (never exposed to customers).
alter table clients add column if not exists payment_link_emailed_at timestamptz;

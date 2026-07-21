-- Store the shop's trade (locksmith, plumber, electrician, …) on the client row.
-- Signup already collects `trade` but it only rode the ops notification — nothing
-- persisted it. Storing it is light groundwork so a future non-locksmith launch can
-- route/tune per trade without a scramble; today nothing branches on it. Free text,
-- length-bounded to match the signup slice (80 chars).
alter table clients add column if not exists trade text;
alter table clients drop constraint if exists clients_trade_len_check;
alter table clients add constraint clients_trade_len_check
  check (trade is null or char_length(trade) <= 80);

-- Customer-safe display column, consistent with the other column-scoped SELECTs
-- granted to authenticated users (RLS still restricts to their own row).
grant select (trade) on clients to authenticated;

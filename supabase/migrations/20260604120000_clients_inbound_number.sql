alter table clients add column if not exists inbound_number text;

create unique index if not exists clients_inbound_number_key
  on clients (inbound_number) where inbound_number is not null;

alter table clients add column if not exists cell_number text;
alter table clients add column if not exists answer_mode text not null default 'human_first';
alter table clients add column if not exists ring_timeout_seconds int not null default 18;
alter table clients add column if not exists business_hours jsonb;

alter table clients drop constraint if exists clients_answer_mode_check;
alter table clients add constraint clients_answer_mode_check
  check (answer_mode in ('human_first', 'ai_first', 'scheduled'));

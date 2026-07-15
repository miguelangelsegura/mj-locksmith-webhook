-- Customer-set average job value. The dashboard turns "jobs captured" into an
-- estimated dollar figure using THIS number (the shop's real ticket price) instead
-- of a global guess. Default 150 keeps existing rows sensible; bounded so the ROI
-- math can't be driven to absurd values.
alter table clients add column if not exists avg_job_value numeric not null default 150;
alter table clients drop constraint if exists clients_avg_job_value_check;
alter table clients add constraint clients_avg_job_value_check
  check (avg_job_value >= 0 and avg_job_value <= 100000);

-- Customer-safe display column (read via the service-role /me today; granted for
-- consistency with the other column-scoped SELECTs from the auth+RLS migration).
grant select (avg_job_value) on clients to authenticated;

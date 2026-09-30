-- Lock the desk to one owner. Run after the owner has created an account.
-- Replace OWNER_EMAIL, then also turn off sign-ups (Authentication → Sign In / Providers).
create table if not exists owners (email text primary key);
alter table owners enable row level security;
insert into owners (email) values ('OWNER_EMAIL') on conflict do nothing;

drop policy if exists "owner all programs" on programs;
drop policy if exists "owner all tasks" on tasks;
create policy "owner all programs" on programs for all to authenticated
  using (exists (select 1 from owners o where o.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from owners o where o.email = auth.jwt() ->> 'email'));
create policy "owner all tasks" on tasks for all to authenticated
  using (exists (select 1 from owners o where o.email = auth.jwt() ->> 'email'))
  with check (exists (select 1 from owners o where o.email = auth.jwt() ->> 'email'));

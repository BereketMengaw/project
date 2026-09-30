-- Lock the desk to one owner. Run after the owner has an account.
-- Replace OWNER_EMAIL, then turn off sign-ups (Authentication → Sign In / Providers).
create table if not exists owners (email text primary key);
alter table owners enable row level security;
insert into owners (email) values ('OWNER_EMAIL') on conflict do nothing;

-- security definer so the check can read owners even though owners itself is locked
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from owners where email = auth.jwt() ->> 'email');
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

drop policy if exists "owner all programs" on programs;
drop policy if exists "owner all tasks" on tasks;
create policy "owner all programs" on programs for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner all tasks" on tasks for all to authenticated using (public.is_owner()) with check (public.is_owner());

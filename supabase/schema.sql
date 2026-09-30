-- Scholarship Desk schema. Run once in Supabase → SQL Editor, then run seed.sql.
create table if not exists programs (
  id text primary key,
  name text not null,
  host text,
  kind text check (kind in ('scholarship','funded','self-funded')),
  section text,
  funding text,
  deadline date,
  deadline_text text,
  deadline_estimated boolean default false,
  eligibility text check (eligibility in ('yes','borderline','no')),
  eligibility_note text,
  fit text,
  fit_note text,
  discounts text,
  url text,
  status text default 'watch' check (status in ('watch','preparing','applied','submitted','interview','accepted','rejected','skip')),
  notes text,
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  done boolean default false,
  sort int default 50,
  created_at timestamptz default now()
);

-- Only signed-in users can read or write. Turn off new sign-ups after you
-- create your own login (Authentication → Sign In / Providers → "Allow new users to sign up" off).
alter table programs enable row level security;
alter table tasks enable row level security;
drop policy if exists "owner all programs" on programs;
drop policy if exists "owner all tasks" on tasks;
create policy "owner all programs" on programs for all to authenticated using (true) with check (true);
create policy "owner all tasks" on tasks for all to authenticated using (true) with check (true);

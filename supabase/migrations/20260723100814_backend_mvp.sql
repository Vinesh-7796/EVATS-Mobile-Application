-- EVATS P1.1 Backend MVP
--
-- This migration intentionally covers only the backend MVP.  Offline queuing,
-- telemetry, content versioning, and the admin experience are separate phases.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  auth_uid uuid not null unique references auth.users (id) on delete cascade,
  role text not null default 'trainee' check (role in ('trainee', 'intern', 'admin')),
  employee_id text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  module_id text not null,
  status text not null check (status in ('locked', 'unlocked', 'in_progress', 'completed')),
  unlocked_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, module_id),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  module_id text not null,
  score integer not null check (score >= 0),
  total_points integer not null check (total_points > 0),
  percentage numeric(5, 2) not null check (percentage >= 0 and percentage <= 100),
  grade text not null,
  correct_answers integer not null check (correct_answers >= 0),
  total_questions integer not null check (total_questions > 0),
  taken_at timestamptz not null default now(),
  check (correct_answers <= total_questions)
);

create table public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  module_id text not null,
  game_type text not null,
  score integer not null check (score >= 0),
  percentage numeric(5, 2) not null check (percentage >= 0 and percentage <= 100),
  grade text not null,
  taken_at timestamptz not null default now()
);

create table public.streaks (
  user_id uuid primary key references public.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_active_date date not null default current_date,
  updated_at timestamptz not null default now(),
  check (longest_streak >= current_streak)
);

create index quiz_attempts_module_percentage_idx
  on public.quiz_attempts (module_id, percentage desc);
create index quiz_attempts_user_taken_at_idx
  on public.quiz_attempts (user_id, taken_at desc);
create index game_attempts_user_taken_at_idx
  on public.game_attempts (user_id, taken_at desc);
create index module_progress_user_id_idx
  on public.module_progress (user_id);

-- Create the public profile and streak row in the same transaction as signup.
-- A SECURITY DEFINER trigger is required because the client has no access to
-- auth.users and profile creation should not depend on an extra client request.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, auth_uid, display_name)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- The project may already have Supabase Auth users when this migration is
-- applied, so seed the same rows for them as the signup trigger creates.
insert into public.users (id, auth_uid, display_name)
select
  id,
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
from auth.users
on conflict (id) do nothing;

insert into public.streaks (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();
create trigger module_progress_set_updated_at
  before update on public.module_progress
  for each row execute procedure public.set_updated_at();
create trigger streaks_set_updated_at
  before update on public.streaks
  for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.module_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.game_attempts enable row level security;
alter table public.streaks enable row level security;

-- Every table is tenant-isolated by the Supabase Auth subject.  No client-side
-- role can broaden this access; the admin reporting experience is deferred.
create policy "Users can read their own profile"
  on public.users for select to authenticated
  using (auth.uid() = id and auth.uid() = auth_uid);
create policy "Users can update their own profile"
  on public.users for update to authenticated
  using (auth.uid() = id and auth.uid() = auth_uid)
  with check (auth.uid() = id and auth.uid() = auth_uid);

create policy "Users can read their own module progress"
  on public.module_progress for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create their own module progress"
  on public.module_progress for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update their own module progress"
  on public.module_progress for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create their own quiz attempts"
  on public.quiz_attempts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read their own game attempts"
  on public.game_attempts for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create their own game attempts"
  on public.game_attempts for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read their own streak"
  on public.streaks for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can create their own streak"
  on public.streaks for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update their own streak"
  on public.streaks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS deliberately prevents a trainee from reading the whole cohort.  This
-- narrowly scoped RPC performs the percentile aggregation server-side and
-- exposes only the derived value. Rank is zero-based so the highest score maps
-- to 100 and the formula is 1 - (rank / total attempts), as required by P1.1.
create or replace function public.get_module_percentile(
  p_module_id text,
  p_percentage numeric
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with cohort as (
    select percentage
    from public.quiz_attempts
    where module_id = p_module_id
  ), ranking as (
    select
      count(*) filter (where percentage > p_percentage)::numeric as higher_scores,
      count(*)::numeric as total_attempts
    from cohort
  )
  select case
    when total_attempts = 0 then 0
    else round((1 - (higher_scores / total_attempts)) * 100)::integer
  end
  from ranking;
$$;

revoke all on function public.get_module_percentile(text, numeric) from public;
grant execute on function public.get_module_percentile(text, numeric) to authenticated;

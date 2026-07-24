-- RLS policies decide which rows an authenticated user may access. These
-- privileges allow PostgREST to reach the tables so that those policies can run.
grant select, update on public.users to authenticated;
grant select, insert, update on public.module_progress to authenticated;
grant select, insert on public.quiz_attempts to authenticated;
grant select, insert on public.game_attempts to authenticated;
grant select, insert, update on public.streaks to authenticated;

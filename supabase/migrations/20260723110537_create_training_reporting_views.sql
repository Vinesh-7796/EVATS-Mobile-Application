-- Manager-facing reporting views. This schema is intentionally not exposed to
-- the mobile Data API; a server-side BI tool such as Metabase connects with a
-- protected database credential and gives managers its own authenticated UI.
create schema if not exists reporting;
revoke all on schema reporting from public, anon, authenticated;

create or replace function reporting.grade_for_percentage(p_percentage numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_percentage >= 95 then 'A+'
    when p_percentage >= 90 then 'A'
    when p_percentage >= 80 then 'B'
    when p_percentage >= 70 then 'C'
    when p_percentage >= 60 then 'D'
    else 'F'
  end;
$$;

-- One row per user/module. The latest aggregate evaluation is used if a user
-- repeats a module; this mirrors the current training-state presentation.
create or replace view reporting.training_module_detail as
with module_catalog (module_order, module_id, module_name) as (
  values
    (1, 'hv-power', 'HV Power System'),
    (2, 'lv-power', 'LV Power System'),
    (3, 'can-bus', 'CAN Bus Network'),
    (4, 'hv-aux', 'HV Auxiliary Network'),
    (5, 'regen-braking', 'Regenerative Braking'),
    (6, 'propulsion', 'Propulsion System'),
    (7, 'overall-power', 'Overall Power System'),
    (8, 'pneumatic', 'Pneumatic Systems')
), latest_evaluation as (
  select distinct on (user_id, module_id)
    id,
    user_id,
    module_id,
    percentage,
    grade,
    taken_at
  from public.quiz_attempts
  order by user_id, module_id, taken_at desc, id desc
)
select
  u.id as user_id,
  coalesce(nullif(u.display_name, ''), nullif(u.employee_id, ''), left(u.auth_uid::text, 8)) as user_name,
  u.employee_id,
  u.role,
  modules.module_order,
  modules.module_id,
  modules.module_name,
  case
    when evaluation.id is not null then 'Completed'
    when progress.status = 'in_progress' then 'In progress'
    when progress.status = 'unlocked' then 'Not started'
    when progress.status = 'completed' then 'Completed'
    else 'Locked'
  end as module_status,
  evaluation.grade,
  evaluation.percentage as evaluation_percentage,
  evaluation.taken_at as evaluation_taken_at,
  progress.unlocked_at,
  progress.completed_at,
  format(
    '%s — %s',
    modules.module_name,
    case
      when evaluation.id is not null then evaluation.grade
      when progress.status = 'in_progress' then 'In progress'
      when progress.status = 'unlocked' then 'Not started'
      when progress.status = 'completed' then 'Completed'
      else 'Locked'
    end
  ) as module_grade_progress
from public.users u
cross join module_catalog modules
left join public.module_progress progress
  on progress.user_id = u.id
 and progress.module_id = modules.module_id
left join latest_evaluation evaluation
  on evaluation.user_id = u.id
 and evaluation.module_id = modules.module_id;

-- One manager-friendly overview row per trainee. The progress column contains
-- all eight ordered modules for display/export, while the detail view above is
-- retained for Excel filters and pivot tables.
create or replace view reporting.training_user_overview as
select
  detail.user_id,
  max(detail.user_name) as user_name,
  max(detail.employee_id) as employee_id,
  max(detail.role) as role,
  format(
    '%s / %s days',
    coalesce(max(streak.current_streak), 0),
    coalesce(max(streak.longest_streak), 0)
  ) as streak,
  count(*) filter (where detail.module_status = 'Completed')::integer as modules_completed,
  string_agg(detail.module_grade_progress, E'\n' order by detail.module_order) as modules_grade_progress,
  round(avg(detail.evaluation_percentage) filter (where detail.module_status = 'Completed'), 1) as average_percentage,
  case
    when avg(detail.evaluation_percentage) filter (where detail.module_status = 'Completed') is null then null
    else reporting.grade_for_percentage(
      avg(detail.evaluation_percentage) filter (where detail.module_status = 'Completed')
    )
  end as average_grade,
  max(streak.last_active_date) as last_active_date
from reporting.training_module_detail detail
left join public.streaks streak on streak.user_id = detail.user_id
group by detail.user_id;

comment on view reporting.training_user_overview is
  'Manager overview: one row per user, combined current/best streak, all 8 module statuses and grades, and average grade.';
comment on view reporting.training_module_detail is
  'Excel-friendly detail: one row per user and module for filtering and pivot tables.';

-- Append score columns to the existing reporting views without changing their
-- established column order. Existing consumers can continue using the views.
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
    score,
    total_points,
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
  ) as module_grade_progress,
  evaluation.score as evaluation_score,
  evaluation.total_points as evaluation_total_points
from public.users u
cross join module_catalog modules
left join public.module_progress progress
  on progress.user_id = u.id
 and progress.module_id = modules.module_id
left join latest_evaluation evaluation
  on evaluation.user_id = u.id
 and evaluation.module_id = modules.module_id;

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
  max(streak.last_active_date) as last_active_date,
  coalesce(sum(detail.evaluation_score) filter (where detail.module_status = 'Completed'), 0)::integer as total_score
from reporting.training_module_detail detail
left join public.streaks streak on streak.user_id = detail.user_id
group by detail.user_id;

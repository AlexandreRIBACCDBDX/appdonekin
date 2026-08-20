-- DoneKin schema — 34: expand dashboard timeseries to every period metric
--
-- The first cut of admin_get_dashboard_timeseries only tracked 3 metrics
-- (new accounts, tasks created, tasks completed) — every other StatCard on
-- "Sur la période sélectionnée" (new circles, new members, active users,
-- points redeemed, self-task cap hits) had no daily breakdown to chart.
-- Adds all of them to the same generate_series backbone so every stat card
-- can carry its own sparkline.

create or replace function admin_get_dashboard_timeseries(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_days int;
  v_since timestamptz;
  v_result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  v_days := case p_period
    when '24h' then 1
    when '7d' then 7
    when '30d' then 30
    when '90d' then 90
    else 7
  end;
  v_since := date_trunc('day', now()) - (v_days - 1) * interval '1 day';

  select coalesce(jsonb_agg(jsonb_build_object(
    'day', to_char(d.day, 'YYYY-MM-DD'),
    'new_accounts', coalesce(acc.c, 0),
    'new_circles', coalesce(circ.c, 0),
    'new_members', coalesce(mem.c, 0),
    'tasks_created', coalesce(tc.c, 0),
    'tasks_completed', coalesce(tv.c, 0),
    'active_users', coalesce(au.c, 0),
    'points_redeemed', coalesce(pr.c, 0),
    'self_task_cap_hits', coalesce(cap.c, 0)
  ) order by d.day), '[]'::jsonb) into v_result
  from generate_series(v_since, date_trunc('day', now()), interval '1 day') as d(day)
  left join (
    select date_trunc('day', created_at) as day, count(*) as c
    from profiles where created_at >= v_since group by 1
  ) acc on acc.day = d.day
  left join (
    select date_trunc('day', created_at) as day, count(*) as c
    from circles where created_at >= v_since group by 1
  ) circ on circ.day = d.day
  left join (
    select date_trunc('day', joined_at) as day, count(*) as c
    from circle_members where joined_at >= v_since group by 1
  ) mem on mem.day = d.day
  left join (
    select date_trunc('day', created_at) as day, count(*) as c
    from tasks where created_at >= v_since group by 1
  ) tc on tc.day = d.day
  left join (
    select date_trunc('day', validated_at) as day, count(*) as c
    from task_completions where status = 'approved' and validated_at >= v_since group by 1
  ) tv on tv.day = d.day
  left join (
    select date_trunc('day', created_at) as day, count(distinct actor_user_id) as c
    from activity_events where created_at >= v_since and actor_user_id is not null group by 1
  ) au on au.day = d.day
  left join (
    select date_trunc('day', created_at) as day, coalesce(sum(-amount), 0) as c
    from point_transactions where type = 'reward_purchase' and created_at >= v_since group by 1
  ) pr on pr.day = d.day
  left join (
    select date_trunc('day', tc2.submitted_at) as day, count(*) as c
    from task_completions tc2
    join tasks t2 on t2.id = tc2.task_id
    where t2.assigned_to_member_id = t2.created_by_member_id
      and tc2.status = 'approved'
      and tc2.submitted_at >= v_since
      and not exists (
        select 1 from point_transactions pt2
        where pt2.task_completion_id = tc2.id and pt2.type = 'task_reward'
      )
    group by 1
  ) cap on cap.day = d.day;

  return v_result;
end;
$$;

grant execute on function admin_get_dashboard_timeseries(text) to authenticated;

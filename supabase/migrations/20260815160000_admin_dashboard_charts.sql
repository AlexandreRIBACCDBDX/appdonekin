-- DoneKin schema — 33: dashboard chart data (daily trend + circle types)
--
-- The dashboard only ever showed single aggregate numbers for the selected
-- period (StatCard tiles) — no way to see whether "12 new accounts this
-- week" was a steady trickle or all on one day. Adds a genuine time series
-- so the back office can chart it: one row per calendar day in the period
-- (generate_series fills in days with zero activity — a chart with gaps
-- silently misrepresents the trend), for new accounts, tasks created, and
-- tasks completed. Also adds a circles-by-type breakdown to the existing
-- overview stats, cheap to compute and useful as a simple bar chart.

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
    'tasks_created', coalesce(tc.c, 0),
    'tasks_completed', coalesce(tv.c, 0)
  ) order by d.day), '[]'::jsonb) into v_result
  from generate_series(v_since, date_trunc('day', now()), interval '1 day') as d(day)
  left join (
    select date_trunc('day', created_at) as day, count(*) as c
    from profiles where created_at >= v_since
    group by 1
  ) acc on acc.day = d.day
  left join (
    select date_trunc('day', created_at) as day, count(*) as c
    from tasks where created_at >= v_since
    group by 1
  ) tc on tc.day = d.day
  left join (
    select date_trunc('day', validated_at) as day, count(*) as c
    from task_completions where status = 'approved' and validated_at >= v_since
    group by 1
  ) tv on tv.day = d.day;

  return v_result;
end;
$$;

create or replace function admin_get_dashboard_stats(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_since timestamptz;
  v_result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'not_platform_admin';
  end if;

  v_since := now() - (case p_period
    when '24h' then interval '1 day'
    when '7d' then interval '7 days'
    when '30d' then interval '30 days'
    when '90d' then interval '90 days'
    else interval '7 days'
  end);

  select jsonb_build_object(
    'users_total', (select count(*) from profiles where status <> 'deleted'),
    'circles_total', (select count(*) from circles where archived_at is null),
    'members_total', (select count(*) from circle_members where archived_at is null),
    'tasks_created_total', (select count(*) from tasks),
    'tasks_completed_total', (select count(*) from tasks where status = 'completed'),
    'new_accounts_today', (select count(*) from profiles where created_at >= date_trunc('day', now())),
    'new_accounts_period', (select count(*) from profiles where created_at >= v_since),
    'new_circles_period', (select count(*) from circles where created_at >= v_since),
    'tasks_created_period', (select count(*) from tasks where created_at >= v_since),
    'tasks_completed_period', (
      select count(*) from task_completions where status = 'approved' and validated_at >= v_since
    ),
    'active_users_period', (
      select count(distinct actor_user_id) from activity_events
      where created_at >= v_since and actor_user_id is not null
    ),
    'points_redeemed_period', (
      select coalesce(sum(-amount), 0) from point_transactions
      where type = 'reward_purchase' and created_at >= v_since
    ),
    'self_task_cap_hits_period', (
      select count(*)
      from task_completions tc
      join tasks t on t.id = tc.task_id
      where t.assigned_to_member_id = t.created_by_member_id
        and tc.status = 'approved'
        and tc.submitted_at >= v_since
        and not exists (
          select 1 from point_transactions pt
          where pt.task_completion_id = tc.id and pt.type = 'task_reward'
        )
    ),
    'circles_by_type', (
      select coalesce(jsonb_object_agg(type, cnt), '{}'::jsonb)
      from (select type, count(*) as cnt from circles where archived_at is null group by type) t
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function admin_get_dashboard_timeseries(text) to authenticated;
grant execute on function admin_get_dashboard_stats(text) to authenticated;

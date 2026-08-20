-- DoneKin schema — 27: weekly leaderboard ("classement de la semaine")
--
-- Read-only aggregation over point_transactions, which every circle member
-- can already SELECT for their own circle (point_transactions_select_member
-- RLS policy). No new table, no SECURITY DEFINER needed — this function is
-- SECURITY INVOKER by default (the plain `language sql` default), so RLS on
-- circle_members/point_transactions applies exactly as if the caller wrote
-- the query themselves: a non-member of p_circle_id sees an empty result,
-- never another circle's data.
--
-- "Earned this week" mirrors member_wallets.total_earned's own definition —
-- positive amounts, excluding 'project_contribution' (a project's shared
-- pool, not a personal achievement) — scoped to the current ISO week
-- (Monday start, via date_trunc).

create or replace function circle_weekly_leaderboard(p_circle_id uuid)
returns table (
  member_id uuid,
  first_name text,
  avatar_url text,
  points_earned numeric
)
language sql
stable
as $$
  select
    cm.id as member_id,
    cm.first_name,
    cm.avatar_url,
    coalesce(sum(pt.amount) filter (
      where pt.amount > 0
        and pt.type <> 'project_contribution'
        and pt.created_at >= date_trunc('week', now())
    ), 0)::numeric(10,1) as points_earned
  from circle_members cm
  left join point_transactions pt on pt.member_id = cm.id and pt.circle_id = p_circle_id
  where cm.circle_id = p_circle_id and cm.archived_at is null
  group by cm.id, cm.first_name, cm.avatar_url
  order by points_earned desc, cm.first_name;
$$;

grant execute on function circle_weekly_leaderboard(uuid) to authenticated;

-- DoneKin schema — 36: weekly circle challenge — column + function
--
-- A cooperative counterpart to the individual weekly leaderboard: the whole
-- circle shares one Dones target for the week (Monday-start, same boundary
-- as the leaderboard). Reaching it pays every active member a flat bonus,
-- once — mirrors complete_project()'s "+5 to every participant" pattern
-- (a collective goal rewards everyone equally, not proportionally to who
-- contributed most).
--
-- No cron in this project (confirmed elsewhere in this schema — every
-- time-boundary effect, like the late-completion penalty, is settled
-- lazily on the next relevant read/write, never on a schedule), so this
-- follows the same shape: get_circle_weekly_challenge() checks the current
-- total against the target every time it's called (Home screen, on every
-- load) and pays the bonus the first time it notices the target was
-- reached — idempotent, guarded by checking whether a
-- 'weekly_challenge_bonus' transaction already exists for this circle
-- this week.
--
-- weekly_challenge_target is nullable — null means "use the auto-scaled
-- default" (5 Dones per active member, floor of 10), so a circle works
-- out of the box with no configuration. Nothing here writes to that column
-- yet — it's ready for an admin/owner override to be added as a later, and
-- fully backward-compatible, change.

alter table circles add column weekly_challenge_target numeric(6,1);

create or replace function get_circle_weekly_challenge(p_circle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_week_start timestamptz := date_trunc('week', now());
  v_member_count int;
  v_target numeric(6,1);
  v_total numeric(6,1);
  v_already_paid boolean;
  v_bonus numeric(6,1) := 3;
  v_member record;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not is_circle_member(p_circle_id) then
    raise exception 'not_authorized';
  end if;

  select count(*) into v_member_count
  from circle_members where circle_id = p_circle_id and archived_at is null;

  select coalesce(weekly_challenge_target, greatest(10, v_member_count * 5)) into v_target
  from circles where id = p_circle_id;

  select coalesce(sum(amount), 0) into v_total
  from point_transactions
  where circle_id = p_circle_id
    and amount > 0
    and type <> 'project_contribution'
    and created_at >= v_week_start;

  select exists(
    select 1 from point_transactions
    where circle_id = p_circle_id
      and type = 'weekly_challenge_bonus'
      and created_at >= v_week_start
  ) into v_already_paid;

  if v_total >= v_target and not v_already_paid then
    for v_member in
      select id, user_id from circle_members where circle_id = p_circle_id and archived_at is null
    loop
      insert into point_transactions (circle_id, member_id, amount, type, created_by_user_id, metadata)
      values (
        p_circle_id, v_member.id, v_bonus, 'weekly_challenge_bonus', v_uid,
        jsonb_build_object('target', v_target, 'total', v_total)
      );

      perform notify_member_or_guardians(
        v_member.id, p_circle_id, 'points_transferred',
        'Défi de la semaine réussi !',
        'Le cercle a atteint son objectif — +' || v_bonus || ' Dones pour tout le monde 🎉',
        jsonb_build_object('target', v_target, 'total', v_total)
      );
    end loop;

    insert into activity_events (circle_id, type, actor_user_id, points, metadata)
    values (
      p_circle_id, 'weekly_challenge_completed', v_uid, v_bonus,
      jsonb_build_object('target', v_target, 'total', v_total)
    );

    v_already_paid := true;
  end if;

  return jsonb_build_object(
    'target', v_target,
    'total', v_total,
    'reached', v_total >= v_target,
    'bonus_paid', v_already_paid,
    'bonus_amount', v_bonus
  );
end;
$$;

grant execute on function get_circle_weekly_challenge(uuid) to authenticated;

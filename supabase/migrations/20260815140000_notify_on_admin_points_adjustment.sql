-- DoneKin schema — 31: notify the member when an admin adjusts their points
--
-- admin_adjust_points (back office, dispute/correction tool) silently
-- changed a member's balance with no notification at all — the only way
-- they'd notice was stumbling on it in their wallet history. Every other
-- points-moving path in the app (transfer_points, grant_bonus_points)
-- already notifies the recipient via notify_member_or_guardians(), which
-- itself already handles fanning out to guardians for a phone-less managed
-- member — same call, same 'points_transferred' notification_type reused
-- (grant_bonus_points already reuses it for a non-transfer bonus, so this
-- is consistent, not a new type).

create or replace function admin_adjust_points(p_member_id uuid, p_amount numeric, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
begin
  perform require_platform_role('super_admin', 'admin');

  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select circle_id into v_circle_id from circle_members where id = p_member_id;
  if v_circle_id is null then
    raise exception 'member_not_found';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, created_by_user_id, metadata)
  values (v_circle_id, p_member_id, p_amount, 'admin_adjustment', auth.uid(), jsonb_build_object('reason', p_reason));

  insert into activity_events (circle_id, type, actor_user_id, subject_member_id, points, metadata)
  values (v_circle_id, 'admin_adjustment', auth.uid(), p_member_id, p_amount, jsonb_build_object('reason', p_reason));

  insert into admin_audit_logs (admin_user_id, action, target_type, target_id, reason, metadata)
  values (auth.uid(), 'POINTS_ADJUSTED', 'circle_member', p_member_id, p_reason, jsonb_build_object('amount', p_amount));

  perform notify_member_or_guardians(
    p_member_id, v_circle_id, 'points_transferred',
    'Ajustement de points',
    (case when p_amount > 0 then '+' else '' end) || p_amount || ' pts — ' || p_reason,
    jsonb_build_object('amount', p_amount, 'reason', p_reason)
  );
end;
$$;

grant execute on function admin_adjust_points(uuid, numeric, text) to authenticated;

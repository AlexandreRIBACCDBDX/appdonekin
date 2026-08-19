-- DoneKin schema — 22: contribute_to_project()
--
-- Lets any circle member pay Dones from their own personal wallet into a
-- project's shared pool, on top of the Dones tasks already route there via
-- credit_task_completion_points(). Two-row ledger, same shape as
-- transfer_points(): a 'project_payment' debit on the contributor (counts
-- against their personal balance — member_wallets only excludes
-- 'project_contribution' rows) and a 'project_contribution' credit on the
-- project (project_wallets already sums that type regardless of whether it
-- came from a task or a direct payment — no view change needed).

create or replace function contribute_to_project(
  p_project_id uuid,
  p_amount numeric,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_project projects;
  v_member_id uuid;
  v_balance numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select * into v_project from projects where id = p_project_id;
  if v_project is null then
    raise exception 'project_not_found';
  end if;
  if v_project.status = 'completed' then
    raise exception 'project_already_completed';
  end if;

  v_member_id := my_member_id(v_project.circle_id);
  if v_member_id is null then
    raise exception 'not_a_member';
  end if;

  select coalesce(sum(amount), 0) into v_balance
  from point_transactions where member_id = v_member_id and type <> 'project_contribution';
  if v_balance < p_amount then
    raise exception 'insufficient_points';
  end if;

  insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
  values (v_project.circle_id, v_member_id, -p_amount, 'project_payment', p_project_id, v_uid, jsonb_build_object('note', p_note));

  insert into point_transactions (circle_id, member_id, amount, type, project_id, created_by_user_id, metadata)
  values (v_project.circle_id, v_member_id, p_amount, 'project_contribution', p_project_id, v_uid, jsonb_build_object('note', p_note));

  insert into activity_events (circle_id, type, actor_member_id, actor_user_id, subject_member_id, project_id, points, metadata)
  values (
    v_project.circle_id, 'project_payment', v_member_id, v_uid, v_member_id, p_project_id, p_amount,
    jsonb_build_object('title', v_project.title)
  );

  -- A contributor who wasn't already assigned a task in this project still
  -- becomes a participant — same list complete_project() pays the +5
  -- completion bonus to.
  insert into project_members (project_id, member_id) values (p_project_id, v_member_id) on conflict do nothing;
end;
$$;

grant execute on function contribute_to_project(uuid, numeric, text) to authenticated;

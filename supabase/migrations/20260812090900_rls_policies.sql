-- DoneKin schema — 10: Row Level Security
--
-- Golden rule: a user can only ever see/touch data belonging to circles
-- they are a member of. Money-like data (point_transactions) and identity-
-- sensitive data (task_completions, reward_redemptions, invitations,
-- audit_log) have NO client-facing write policy at all — they can only be
-- written by the SECURITY DEFINER RPC functions in the next migration,
-- which enforce business rules (balance checks, permission checks,
-- idempotency) that RLS alone cannot express.

alter table profiles enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table guardian_relationships enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table task_completions enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;
alter table point_transactions enable row level security;
alter table activity_events enable row level security;
alter table notifications enable row level security;
alter table invitations enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------
-- profiles: a user only ever sees/edits their own account. Display info
-- for other people is denormalized onto circle_members precisely so the
-- app never needs cross-user visibility into `profiles`.
-- ---------------------------------------------------------------------
create policy profiles_select_own on profiles
  for select using (id = auth.uid());

create policy profiles_update_own on profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------
-- circles
-- ---------------------------------------------------------------------
create policy circles_select_member on circles
  for select using (is_circle_member(id));

create policy circles_insert_authenticated on circles
  for insert with check (created_by_user_id = auth.uid());

create policy circles_update_admin on circles
  for update using (is_circle_admin(id));

-- ---------------------------------------------------------------------
-- circle_members
-- No INSERT policy: creation always goes through create_circle() /
-- add_circle_member() / accept_invitation() (SECURITY DEFINER), which
-- atomically set up guardian relationships and audit rows alongside it.
-- ---------------------------------------------------------------------
create policy circle_members_select_member on circle_members
  for select using (is_circle_member(circle_id));

create policy circle_members_update_authorized on circle_members
  for update using (
    user_id = auth.uid()
    or is_circle_admin(circle_id)
    or can_edit_member_profile(id)
  );

-- ---------------------------------------------------------------------
-- guardian_relationships — admin-managed in the MVP (assigning who can
-- act for whom is sensitive enough to keep centralized).
-- ---------------------------------------------------------------------
create policy guardian_relationships_select_member on guardian_relationships
  for select using (is_circle_member(circle_id));

create policy guardian_relationships_write_admin on guardian_relationships
  for all using (is_circle_admin(circle_id))
  with check (is_circle_admin(circle_id));

-- ---------------------------------------------------------------------
-- projects / project_members
-- ---------------------------------------------------------------------
create policy projects_select_member on projects
  for select using (is_circle_member(circle_id));

create policy projects_insert_member on projects
  for insert with check (is_circle_member(circle_id) and created_by_user_id = auth.uid());

create policy projects_update_authorized on projects
  for update using (is_circle_admin(circle_id) or created_by_user_id = auth.uid());

create policy project_members_select_member on project_members
  for select using (
    exists (select 1 from projects p where p.id = project_id and is_circle_member(p.circle_id))
  );

create policy project_members_write_authorized on project_members
  for all using (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (is_circle_admin(p.circle_id) or p.created_by_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (is_circle_admin(p.circle_id) or p.created_by_user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- tasks — any circle member can create/assign; editing is restricted to
-- the creator, the assignee's manager, or an admin.
-- ---------------------------------------------------------------------
create policy tasks_select_member on tasks
  for select using (is_circle_member(circle_id));

create policy tasks_insert_member on tasks
  for insert with check (is_circle_member(circle_id) and created_by_user_id = auth.uid());

create policy tasks_update_authorized on tasks
  for update using (
    is_circle_admin(circle_id)
    or created_by_user_id = auth.uid()
    or (assigned_to_member_id is not null and can_manage_member_tasks(assigned_to_member_id))
  );

-- ---------------------------------------------------------------------
-- task_completions — read only; writes happen exclusively through
-- complete_task() / validate_task_completion().
-- ---------------------------------------------------------------------
create policy task_completions_select_member on task_completions
  for select using (is_circle_member(circle_id));

-- ---------------------------------------------------------------------
-- rewards
-- ---------------------------------------------------------------------
create policy rewards_select_member on rewards
  for select using (is_circle_member(circle_id));

create policy rewards_insert_member on rewards
  for insert with check (is_circle_member(circle_id) and created_by_user_id = auth.uid());

create policy rewards_update_authorized on rewards
  for update using (is_circle_admin(circle_id) or created_by_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- reward_redemptions — read only; writes go through redeem_reward() /
-- validate_reward_redemption().
-- ---------------------------------------------------------------------
create policy reward_redemptions_select_member on reward_redemptions
  for select using (is_circle_member(circle_id));

-- ---------------------------------------------------------------------
-- point_transactions — read only, ever. This is the anti-cheat guarantee:
-- there is no path for a client to insert/update/delete a ledger row.
-- ---------------------------------------------------------------------
create policy point_transactions_select_member on point_transactions
  for select using (is_circle_member(circle_id));

-- ---------------------------------------------------------------------
-- activity_events — read only; written by RPCs alongside the action they
-- describe.
-- ---------------------------------------------------------------------
create policy activity_events_select_member on activity_events
  for select using (is_circle_member(circle_id));

-- ---------------------------------------------------------------------
-- notifications — a user only ever sees their own.
-- ---------------------------------------------------------------------
create policy notifications_select_own on notifications
  for select using (recipient_user_id = auth.uid());

create policy notifications_update_own on notifications
  for update using (recipient_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- invitations — visible to circle admins and the inviter. Acceptance is
-- handled by accept_invitation(), which looks up by token as SECURITY
-- DEFINER (an invitee is, by definition, not yet a circle member, so they
-- could never satisfy is_circle_member() to read the row directly).
-- ---------------------------------------------------------------------
create policy invitations_select_authorized on invitations
  for select using (is_circle_admin(circle_id) or invited_by_user_id = auth.uid());

-- ---------------------------------------------------------------------
-- audit_log — admins of the circle only.
-- ---------------------------------------------------------------------
create policy audit_log_select_admin on audit_log
  for select using (circle_id is null or is_circle_admin(circle_id));

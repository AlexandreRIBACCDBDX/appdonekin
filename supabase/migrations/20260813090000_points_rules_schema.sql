-- DoneKin schema — 17: points engine v2 (fractional points, project pool)
--
-- New business rules require fractional points (a self-performed task always
-- pays exactly 0.5) and a strict split between two mutually-exclusive point
-- destinations for a given task: the assignee's personal wallet, OR — if the
-- task belongs to a project — the project's shared pool. integer columns
-- can't represent 0.5, so every points-bearing column becomes numeric(6,1).

-- member_wallets depends on point_transactions.amount (it's a plain view,
-- not materialized, but Postgres still refuses to change the type of a
-- column an existing view's rule reads from). Drop it now; it's recreated
-- below with the numeric(10,1) columns it needs anyway.
drop view if exists member_wallets;

alter table tasks alter column points type numeric(6,1) using points::numeric(6,1);
alter table tasks alter column points set default 0;

alter table point_transactions alter column amount type numeric(6,1) using amount::numeric(6,1);

alter table task_completions alter column points_awarded type numeric(6,1) using points_awarded::numeric(6,1);

alter table rewards alter column cost_points type numeric(6,1) using cost_points::numeric(6,1);

alter table reward_redemptions alter column points_spent type numeric(6,1) using points_spent::numeric(6,1);

alter table activity_events alter column points type numeric(6,1) using points::numeric(6,1);

-- Every task now has a real, mandatory "réalisée par" assignee (self-tasks
-- simply have assigned_to_member_id = the creator's own member id).
alter table tasks alter column assigned_to_member_id set not null;

-- The creator's personal commitment ("Réalisation / Promesse du créateur"),
-- confirmed or not by the OTHER project members when the project completes.
alter table projects add column promise_description text;

create table project_promise_votes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  member_id uuid not null references circle_members(id) on delete cascade,
  confirmed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_promise_votes_unique unique (project_id, member_id)
);

create index project_promise_votes_project_idx on project_promise_votes(project_id);

alter table project_promise_votes enable row level security;

create policy project_promise_votes_select_member on project_promise_votes
  for select using (
    exists (select 1 from projects p where p.id = project_id and is_circle_member(p.circle_id))
  );
-- No write policy: only cast_promise_vote() (SECURITY DEFINER) may write here,
-- so "the creator can't vote on their own promise" is enforced in one place.

-- project_members had no automatic population anywhere — keep it in sync
-- rather than adding member-management UI: the creator joins on project
-- creation, and anyone assigned a task in the project joins too. This is
-- the participant list complete_project() pays the +5 bonus to.
create or replace function sync_project_creator_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into project_members (project_id, member_id)
  values (new.id, new.created_by_member_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger projects_sync_creator_membership
  after insert on projects
  for each row execute function sync_project_creator_membership();

create or replace function sync_project_member_from_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_id is not null then
    insert into project_members (project_id, member_id)
    values (new.project_id, new.assigned_to_member_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_project_membership
  after insert or update of project_id, assigned_to_member_id on tasks
  for each row execute function sync_project_member_from_task();

-- Wallet views: 'project_contribution' rows are points a task earned FOR ITS
-- PROJECT, not for the performer personally — they must never count twice,
-- so the personal wallet view excludes them and a dedicated project wallet
-- view sums them instead.
create or replace view member_wallets
  with (security_invoker = on) as
select
  member_id,
  circle_id,
  coalesce(sum(amount), 0)::numeric(10,1) as balance,
  coalesce(sum(amount) filter (where amount > 0), 0)::numeric(10,1) as total_earned,
  coalesce(sum(-amount) filter (where amount < 0), 0)::numeric(10,1) as total_spent
from point_transactions
where type <> 'project_contribution'
group by member_id, circle_id;

create view project_wallets
  with (security_invoker = on) as
select
  project_id,
  coalesce(sum(amount), 0)::numeric(10,1) as balance
from point_transactions
where type = 'project_contribution' and project_id is not null
group by project_id;

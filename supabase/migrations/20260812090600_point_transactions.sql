-- DoneKin schema — 07: point_transactions (the ledger)
--
-- This table is the ONLY source of truth for a member's balance. There is
-- deliberately no "balance" column anywhere and no client-facing INSERT/
-- UPDATE/DELETE policy on this table (see RLS migration): every row is
-- written exclusively by SECURITY DEFINER RPC functions (complete_task,
-- validate_task_completion, redeem_reward, transfer_points, ...), which are
-- the only place allowed to decide that points move.

create table point_transactions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  member_id uuid not null references circle_members(id),
  amount integer not null check (amount <> 0),
  type point_transaction_type not null,
  task_id uuid references tasks(id) on delete set null,
  task_completion_id uuid references task_completions(id) on delete set null,
  reward_redemption_id uuid references reward_redemptions(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  related_member_id uuid references circle_members(id),
  created_by_user_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index point_transactions_member_idx on point_transactions(member_id, created_at desc);
create index point_transactions_circle_idx on point_transactions(circle_id, created_at desc);

-- Wallet balance, computed — never stored. security_invoker means the view
-- runs with the querying user's own RLS on point_transactions, not the
-- view owner's.
create view member_wallets
  with (security_invoker = on) as
select
  member_id,
  circle_id,
  coalesce(sum(amount), 0)::integer as balance,
  coalesce(sum(amount) filter (where amount > 0), 0)::integer as total_earned,
  coalesce(sum(-amount) filter (where amount < 0), 0)::integer as total_spent
from point_transactions
group by member_id, circle_id;

-- DoneKin schema — 06: rewards & reward_redemptions

create table rewards (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  cost_points integer not null check (cost_points > 0),
  icon text,
  is_active boolean not null default true,
  requires_validation boolean not null default true,
  created_by_member_id uuid not null references circle_members(id),
  created_by_user_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index rewards_circle_id_idx on rewards(circle_id) where archived_at is null;

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards(id) on delete cascade,
  circle_id uuid not null references circles(id) on delete cascade,
  redeemed_by_member_id uuid not null references circle_members(id),
  requested_by_user_id uuid not null references profiles(id),
  status redemption_status not null default 'pending_validation',
  points_spent integer not null check (points_spent > 0),
  validated_by_member_id uuid references circle_members(id),
  validated_by_user_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create index reward_redemptions_reward_idx on reward_redemptions(reward_id);
create index reward_redemptions_member_idx on reward_redemptions(redeemed_by_member_id);
create index reward_redemptions_circle_idx on reward_redemptions(circle_id, created_at desc);
create index reward_redemptions_pending_idx on reward_redemptions(circle_id) where status = 'pending_validation';

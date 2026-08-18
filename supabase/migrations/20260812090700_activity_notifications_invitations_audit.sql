-- DoneKin schema — 08: activity_events, notifications, invitations, audit_log

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  type text not null,
  actor_member_id uuid references circle_members(id),
  actor_user_id uuid references profiles(id),
  subject_member_id uuid references circle_members(id),
  task_id uuid references tasks(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  reward_id uuid references rewards(id) on delete set null,
  points integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on column activity_events.subject_member_id is 'The member the event is functionally about (e.g. who completed the task) — this is who the feed credits, even if actor_user_id acted on their behalf.';

create index activity_events_circle_idx on activity_events(circle_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references profiles(id) on delete cascade,
  circle_id uuid references circles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table notifications is 'In-app for MVP. recipient is always a real account — guardian-managed members have no login to notify.';

create index notifications_recipient_idx on notifications(recipient_user_id, created_at desc);
create index notifications_unread_idx on notifications(recipient_user_id) where read_at is null;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles(id) on delete cascade,
  invited_by_user_id uuid not null references profiles(id),
  invited_by_member_id uuid not null references circle_members(id),
  target_member_id uuid references circle_members(id) on delete cascade,
  email text,
  proposed_role circle_role not null default 'member',
  proposed_member_type member_type not null default 'friend',
  token text not null unique,
  status invitation_status not null default 'pending',
  accepted_by_user_id uuid references profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column invitations.target_member_id is 'When set, accepting this invitation CLAIMS an existing guardian-managed member (e.g. a child getting their first phone) instead of creating a new one — history, points and identity are preserved.';

create index invitations_circle_idx on invitations(circle_id);
create index invitations_token_idx on invitations(token);
-- Only one active invitation may target a given managed member at a time.
create unique index invitations_target_member_pending_idx
  on invitations(target_member_id) where status = 'pending' and target_member_id is not null;

create trigger invitations_set_updated_at
  before update on invitations
  for each row execute function set_updated_at();

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles(id) on delete cascade,
  actor_user_id uuid references profiles(id),
  actor_member_id uuid references circle_members(id),
  action text not null,
  subject_member_id uuid references circle_members(id),
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_circle_idx on audit_log(circle_id, created_at desc);

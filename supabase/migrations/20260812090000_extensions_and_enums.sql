-- DoneKin schema — 01: extensions & enums

create extension if not exists pgcrypto;

-- Circle (group) type
create type circle_type as enum ('family', 'friends', 'couple', 'roommates', 'other');

-- Coarse role bundle for a circle_member. Fine-grained guardian permissions
-- live in guardian_relationships, NOT here — role is only a default/UI hint.
create type circle_role as enum ('owner', 'admin', 'parent', 'member', 'child');

-- What kind of person this member is, independent of role/permissions.
create type member_type as enum ('parent', 'child', 'friend', 'other');

-- The crucial distinction from spec section 22:
-- personal_account = this member logs in themselves (circle_members.user_id is set)
-- guardian_managed  = someone else (a guardian) acts on their behalf
create type access_mode as enum ('personal_account', 'guardian_managed');

create type task_status as enum ('todo', 'in_progress', 'pending_validation', 'completed', 'cancelled', 'archived');
create type task_priority as enum ('low', 'medium', 'high');
create type recurrence_frequency as enum ('none', 'daily', 'weekly', 'monthly');

create type completion_status as enum ('pending_validation', 'approved', 'rejected');

create type project_status as enum ('active', 'completed', 'archived');

create type redemption_status as enum ('pending_validation', 'approved', 'rejected', 'cancelled');

create type point_transaction_type as enum (
  'task_reward',
  'reward_purchase',
  'transfer_sent',
  'transfer_received',
  'manual_adjustment',
  'project_contribution',
  'bonus',
  'refund'
);

create type invitation_status as enum ('pending', 'accepted', 'declined', 'expired', 'revoked');

create type notification_type as enum (
  'task_assigned',
  'deadline_soon',
  'task_completed',
  'validation_requested',
  'validation_approved',
  'validation_rejected',
  'reward_redeemed',
  'reward_pending_validation',
  'member_joined',
  'invitation_received',
  'points_transferred'
);

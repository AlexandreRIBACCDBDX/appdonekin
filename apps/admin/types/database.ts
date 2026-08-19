// Hand-written mirror of supabase/migrations/*.sql.
//
// Once you have a live Supabase project, prefer regenerating this file with:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts
// Keep the two in sync until then.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CircleType = 'family' | 'friends' | 'couple' | 'roommates' | 'other';
export type CircleRole = 'owner' | 'admin' | 'parent' | 'member' | 'child';
export type MemberType = 'parent' | 'child' | 'friend' | 'other';
export type AccessMode = 'personal_account' | 'guardian_managed';
export type TaskStatus = 'todo' | 'in_progress' | 'pending_validation' | 'completed' | 'cancelled' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';
export type CompletionStatus = 'pending_validation' | 'approved' | 'rejected';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type RedemptionStatus = 'pending_validation' | 'approved' | 'rejected' | 'cancelled';
export type PointTransactionType =
  | 'task_reward'
  | 'reward_purchase'
  | 'transfer_sent'
  | 'transfer_received'
  | 'manual_adjustment'
  | 'project_contribution'
  | 'bonus'
  | 'refund'
  | 'admin_adjustment'
  | 'late_penalty'
  | 'project_payment';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type ProfileStatus = 'active' | 'suspended' | 'disabled' | 'deleted';
export type PlatformRole = 'super_admin' | 'admin' | 'support' | 'moderator' | 'read_only';
export type NotificationType =
  | 'task_assigned'
  | 'deadline_soon'
  | 'task_completed'
  | 'validation_requested'
  | 'validation_approved'
  | 'validation_rejected'
  | 'reward_redeemed'
  | 'reward_pending_validation'
  | 'member_joined'
  | 'invitation_received'
  | 'points_transferred'
  | 'late_penalty';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Circle = {
  id: string;
  name: string;
  type: CircleType;
  avatar_url: string | null;
  created_by_user_id: string;
  created_at: string;
  archived_at: string | null;
  suspended_at: string | null;
}

export type CircleMember = {
  id: string;
  circle_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  member_type: MemberType;
  role: CircleRole;
  access_mode: AccessMode;
  has_phone: boolean;
  birth_date: string | null;
  created_by_user_id: string;
  joined_at: string;
  archived_at: string | null;
}

export type GuardianRelationship = {
  id: string;
  circle_id: string;
  guardian_member_id: string;
  managed_member_id: string;
  relationship_type: string;
  can_manage_tasks: boolean;
  can_validate_tasks: boolean;
  can_manage_rewards: boolean;
  can_edit_profile: boolean;
  created_by_user_id: string;
  created_at: string;
}

export type Project = {
  id: string;
  circle_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  due_date: string | null;
  created_by_member_id: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  promise_description: string | null;
  target_points: number | null;
}

export type ProjectMember = {
  id: string;
  project_id: string;
  member_id: string;
  added_at: string;
}

export type ProjectPromiseVote = {
  id: string;
  project_id: string;
  member_id: string;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectWallet = {
  project_id: string;
  balance: number;
}

export type Task = {
  id: string;
  circle_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  assigned_to_member_id: string | null;
  created_by_member_id: string;
  created_by_user_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
  requires_validation: boolean;
  due_date: string | null;
  recurrence: RecurrenceFrequency;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export type TaskCompletion = {
  id: string;
  task_id: string;
  circle_id: string;
  performed_by_member_id: string;
  recorded_by_user_id: string;
  status: CompletionStatus;
  points_awarded: number | null;
  notes: string | null;
  validated_by_member_id: string | null;
  validated_by_user_id: string | null;
  submitted_at: string;
  validated_at: string | null;
}

export type Reward = {
  id: string;
  circle_id: string;
  name: string;
  description: string | null;
  cost_points: number;
  icon: string | null;
  is_active: boolean;
  requires_validation: boolean;
  created_by_member_id: string;
  created_by_user_id: string;
  created_at: string;
  archived_at: string | null;
}

export type RewardRedemption = {
  id: string;
  reward_id: string;
  circle_id: string;
  redeemed_by_member_id: string;
  requested_by_user_id: string;
  status: RedemptionStatus;
  points_spent: number;
  validated_by_member_id: string | null;
  validated_by_user_id: string | null;
  created_at: string;
  validated_at: string | null;
}

export type PointTransaction = {
  id: string;
  circle_id: string;
  member_id: string;
  amount: number;
  type: PointTransactionType;
  task_id: string | null;
  task_completion_id: string | null;
  reward_redemption_id: string | null;
  project_id: string | null;
  related_member_id: string | null;
  created_by_user_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export type MemberWallet = {
  member_id: string;
  circle_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export type ActivityEvent = {
  id: string;
  circle_id: string;
  type: string;
  actor_member_id: string | null;
  actor_user_id: string | null;
  subject_member_id: string | null;
  task_id: string | null;
  project_id: string | null;
  reward_id: string | null;
  points: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AppNotification = {
  id: string;
  recipient_user_id: string;
  circle_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type Invitation = {
  id: string;
  circle_id: string;
  invited_by_user_id: string;
  invited_by_member_id: string;
  target_member_id: string | null;
  email: string | null;
  proposed_role: CircleRole;
  proposed_member_type: MemberType;
  token: string;
  status: InvitationStatus;
  accepted_by_user_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export type PlatformAdmin = {
  id: string;
  user_id: string;
  role: PlatformRole;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  last_login_at: string | null;
}

export type AdminAuditLog = {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type PlatformConfigEntry = {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

// Marks columns that have a SQL DEFAULT or are nullable as optional on
// insert — mirrors what `supabase gen types` produces from the real schema.
type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type ProfileInsert = OptionalKeys<
  Profile,
  'email' | 'avatar_url' | 'status' | 'status_changed_at' | 'created_at' | 'updated_at'
>;
type CircleInsert = OptionalKeys<
  Circle,
  'id' | 'type' | 'avatar_url' | 'created_at' | 'archived_at' | 'suspended_at'
>;
type PlatformAdminInsert = OptionalKeys<PlatformAdmin, 'id' | 'is_active' | 'created_at' | 'created_by' | 'last_login_at'>;
type AdminAuditLogInsert = OptionalKeys<
  AdminAuditLog,
  'id' | 'target_type' | 'target_id' | 'reason' | 'metadata' | 'ip_address' | 'created_at'
>;
type FeatureFlagInsert = OptionalKeys<FeatureFlag, 'enabled' | 'description' | 'updated_at' | 'updated_by'>;
type PlatformConfigInsert = OptionalKeys<PlatformConfigEntry, 'updated_at' | 'updated_by'>;
type CircleMemberInsert = OptionalKeys<
  CircleMember,
  | 'id'
  | 'user_id'
  | 'last_name'
  | 'avatar_url'
  | 'member_type'
  | 'role'
  | 'access_mode'
  | 'has_phone'
  | 'birth_date'
  | 'joined_at'
  | 'archived_at'
>;
type GuardianRelationshipInsert = OptionalKeys<
  GuardianRelationship,
  'id' | 'relationship_type' | 'can_manage_tasks' | 'can_validate_tasks' | 'can_manage_rewards' | 'can_edit_profile' | 'created_at'
>;
type ProjectInsert = OptionalKeys<
  Project,
  | 'id'
  | 'description'
  | 'status'
  | 'due_date'
  | 'created_at'
  | 'updated_at'
  | 'archived_at'
  | 'promise_description'
  | 'target_points'
>;
type ProjectPromiseVoteInsert = OptionalKeys<ProjectPromiseVote, 'id' | 'created_at' | 'updated_at'>;
type ProjectMemberInsert = OptionalKeys<ProjectMember, 'id' | 'added_at'>;
type TaskInsert = OptionalKeys<
  Task,
  | 'id'
  | 'project_id'
  | 'description'
  | 'assigned_to_member_id'
  | 'status'
  | 'priority'
  | 'points'
  | 'requires_validation'
  | 'due_date'
  | 'recurrence'
  | 'created_at'
  | 'updated_at'
  | 'archived_at'
>;
type TaskCompletionInsert = OptionalKeys<
  TaskCompletion,
  'id' | 'status' | 'points_awarded' | 'notes' | 'validated_by_member_id' | 'validated_by_user_id' | 'submitted_at' | 'validated_at'
>;
type RewardInsert = OptionalKeys<Reward, 'id' | 'description' | 'icon' | 'is_active' | 'requires_validation' | 'created_at' | 'archived_at'>;
type RewardRedemptionInsert = OptionalKeys<
  RewardRedemption,
  'id' | 'status' | 'validated_by_member_id' | 'validated_by_user_id' | 'created_at' | 'validated_at'
>;
type PointTransactionInsert = OptionalKeys<
  PointTransaction,
  'id' | 'task_id' | 'task_completion_id' | 'reward_redemption_id' | 'project_id' | 'related_member_id' | 'created_at' | 'metadata'
>;
type ActivityEventInsert = OptionalKeys<
  ActivityEvent,
  'id' | 'actor_member_id' | 'actor_user_id' | 'subject_member_id' | 'task_id' | 'project_id' | 'reward_id' | 'points' | 'metadata' | 'created_at'
>;
type NotificationInsert = OptionalKeys<AppNotification, 'id' | 'circle_id' | 'body' | 'data' | 'read_at' | 'created_at'>;
type InvitationInsert = OptionalKeys<
  Invitation,
  'id' | 'target_member_id' | 'email' | 'proposed_role' | 'proposed_member_type' | 'status' | 'accepted_by_user_id' | 'expires_at' | 'created_at' | 'updated_at'
>;

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: Partial<Profile>; Relationships: [] };
      circles: { Row: Circle; Insert: CircleInsert; Update: Partial<Circle>; Relationships: [] };
      circle_members: {
        Row: CircleMember;
        Insert: CircleMemberInsert;
        Update: Partial<CircleMember>;
        Relationships: [];
      };
      guardian_relationships: {
        Row: GuardianRelationship;
        Insert: GuardianRelationshipInsert;
        Update: Partial<GuardianRelationship>;
        Relationships: [];
      };
      projects: { Row: Project; Insert: ProjectInsert; Update: Partial<Project>; Relationships: [] };
      project_members: {
        Row: ProjectMember;
        Insert: ProjectMemberInsert;
        Update: Partial<ProjectMember>;
        Relationships: [];
      };
      project_promise_votes: {
        Row: ProjectPromiseVote;
        Insert: ProjectPromiseVoteInsert;
        Update: Partial<ProjectPromiseVote>;
        Relationships: [];
      };
      tasks: { Row: Task; Insert: TaskInsert; Update: Partial<Task>; Relationships: [] };
      task_completions: {
        Row: TaskCompletion;
        Insert: TaskCompletionInsert;
        Update: Partial<TaskCompletion>;
        Relationships: [];
      };
      rewards: { Row: Reward; Insert: RewardInsert; Update: Partial<Reward>; Relationships: [] };
      reward_redemptions: {
        Row: RewardRedemption;
        Insert: RewardRedemptionInsert;
        Update: Partial<RewardRedemption>;
        Relationships: [];
      };
      point_transactions: {
        Row: PointTransaction;
        Insert: PointTransactionInsert;
        Update: Partial<PointTransaction>;
        Relationships: [];
      };
      activity_events: {
        Row: ActivityEvent;
        Insert: ActivityEventInsert;
        Update: Partial<ActivityEvent>;
        Relationships: [];
      };
      notifications: {
        Row: AppNotification;
        Insert: NotificationInsert;
        Update: Partial<AppNotification>;
        Relationships: [];
      };
      invitations: { Row: Invitation; Insert: InvitationInsert; Update: Partial<Invitation>; Relationships: [] };
      platform_admins: {
        Row: PlatformAdmin;
        Insert: PlatformAdminInsert;
        Update: Partial<PlatformAdmin>;
        Relationships: [];
      };
      admin_audit_logs: {
        Row: AdminAuditLog;
        Insert: AdminAuditLogInsert;
        Update: Partial<AdminAuditLog>;
        Relationships: [];
      };
      feature_flags: { Row: FeatureFlag; Insert: FeatureFlagInsert; Update: Partial<FeatureFlag>; Relationships: [] };
      platform_config: {
        Row: PlatformConfigEntry;
        Insert: PlatformConfigInsert;
        Update: Partial<PlatformConfigEntry>;
        Relationships: [];
      };
    };
    Views: {
      member_wallets: { Row: MemberWallet; Relationships: [] };
      project_wallets: { Row: ProjectWallet; Relationships: [] };
    };
    Functions: {
      create_circle: {
        Args: { p_name: string; p_type: CircleType; p_display_name?: string };
        Returns: Circle;
      };
      add_circle_member: {
        Args: {
          p_circle_id: string;
          p_first_name: string;
          p_member_type: MemberType;
          p_birth_date?: string | null;
          p_has_phone?: boolean;
          p_become_guardian?: boolean;
        };
        Returns: CircleMember;
      };
      set_guardian_relationship: {
        Args: {
          p_circle_id: string;
          p_guardian_member_id: string;
          p_managed_member_id: string;
          p_can_manage_tasks?: boolean;
          p_can_validate_tasks?: boolean;
          p_can_manage_rewards?: boolean;
          p_can_edit_profile?: boolean;
        };
        Returns: GuardianRelationship;
      };
      remove_guardian_relationship: { Args: { p_id: string }; Returns: void };
      create_task: {
        Args: {
          p_circle_id: string;
          p_title: string;
          p_assigned_to_member_id: string;
          p_description?: string | null;
          // Ignored server-side for a self-assigned task (always 0.5 pt, no validation) —
          // only meaningful when p_assigned_to_member_id differs from the caller's own member.
          p_points?: number;
          p_priority?: TaskPriority;
          p_due_date?: string | null;
          p_project_id?: string | null;
          p_recurrence?: RecurrenceFrequency;
        };
        Returns: Task;
      };
      cast_promise_vote: {
        Args: { p_project_id: string; p_confirmed: boolean };
        Returns: ProjectPromiseVote;
      };
      complete_project: { Args: { p_project_id: string }; Returns: Json };
      contribute_to_project: {
        Args: { p_project_id: string; p_amount: number; p_note?: string | null };
        Returns: void;
      };
      complete_task: {
        Args: { p_task_id: string; p_performed_by_member_id: string; p_notes?: string | null };
        Returns: TaskCompletion;
      };
      validate_task_completion: {
        Args: { p_completion_id: string; p_approve: boolean; p_notes?: string | null };
        Returns: TaskCompletion;
      };
      redeem_reward: {
        Args: { p_reward_id: string; p_member_id: string };
        Returns: RewardRedemption;
      };
      validate_reward_redemption: {
        Args: { p_redemption_id: string; p_approve: boolean };
        Returns: RewardRedemption;
      };
      transfer_points: {
        Args: { p_circle_id: string; p_to_member_id: string; p_amount: number; p_note?: string | null };
        Returns: void;
      };
      grant_bonus_points: {
        Args: { p_circle_id: string; p_member_id: string; p_amount: number; p_reason?: string | null };
        Returns: void;
      };
      create_invitation: {
        Args: {
          p_circle_id: string;
          p_email?: string | null;
          p_role?: CircleRole;
          p_member_type?: MemberType;
          p_target_member_id?: string | null;
        };
        Returns: Invitation;
      };
      accept_invitation: { Args: { p_token: string }; Returns: CircleMember };
      revoke_invitation: { Args: { p_invitation_id: string }; Returns: void };
      mark_notification_read: { Args: { p_notification_id: string }; Returns: void };
      mark_all_notifications_read: { Args: Record<string, never>; Returns: void };

      // Platform admin back office — see supabase/migrations/*_admin_rpc.sql
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      get_platform_role: { Args: Record<string, never>; Returns: PlatformRole | null };
      admin_get_dashboard_stats: { Args: { p_period?: string }; Returns: Json };
      admin_global_search: { Args: { p_query: string }; Returns: Json };
      admin_list_users: {
        Args: { p_search?: string | null; p_status?: ProfileStatus | null; p_page?: number; p_page_size?: number };
        Returns: Json;
      };
      admin_get_user_detail: { Args: { p_user_id: string }; Returns: Json };
      admin_suspend_user: { Args: { p_user_id: string; p_reason: string }; Returns: void };
      admin_reactivate_user: { Args: { p_user_id: string; p_reason?: string | null }; Returns: void };
      admin_list_circles: {
        Args: { p_search?: string | null; p_type?: CircleType | null; p_page?: number; p_page_size?: number };
        Returns: Json;
      };
      admin_get_circle_detail: { Args: { p_circle_id: string }; Returns: Json };
      admin_suspend_circle: { Args: { p_circle_id: string; p_reason: string }; Returns: void };
      admin_reactivate_circle: { Args: { p_circle_id: string; p_reason?: string | null }; Returns: void };
      admin_get_task_completion_chain: { Args: { p_task_id: string }; Returns: Json };
      admin_adjust_points: { Args: { p_member_id: string; p_amount: number; p_reason: string }; Returns: void };
      admin_list_invitations: {
        Args: {
          p_circle_id?: string | null;
          p_status?: InvitationStatus | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
      admin_revoke_invitation: { Args: { p_invitation_id: string; p_reason?: string | null }; Returns: void };
      admin_resend_invitation: { Args: { p_invitation_id: string }; Returns: Invitation };
      admin_list_audit_logs: {
        Args: {
          p_admin_user_id?: string | null;
          p_action?: string | null;
          p_target_type?: string | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
      admin_list_platform_admins: { Args: Record<string, never>; Returns: Json };
      admin_set_platform_role: {
        Args: { p_target_email: string; p_role: PlatformRole; p_is_active?: boolean };
        Returns: Json;
      };
      admin_touch_last_login: { Args: Record<string, never>; Returns: void };
      admin_list_feature_flags: { Args: Record<string, never>; Returns: Json };
      admin_set_feature_flag: {
        Args: { p_key: string; p_enabled: boolean; p_description?: string | null };
        Returns: void;
      };
      admin_get_config: { Args: Record<string, never>; Returns: Json };
      admin_set_config: { Args: { p_key: string; p_value: Json }; Returns: void };
    };
  };
}

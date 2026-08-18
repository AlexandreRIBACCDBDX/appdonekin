import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  CircleType,
  InvitationStatus,
  Json,
  PlatformRole,
  ProfileStatus,
} from '@/types/database';

async function rpc<T = Json>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export async function getMyPlatformRole(): Promise<PlatformRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_platform_role');
  return (data as PlatformRole | null) ?? null;
}

export async function getDashboardStats(period: string) {
  return rpc('admin_get_dashboard_stats', { p_period: period });
}

export async function globalSearch(query: string) {
  return rpc('admin_global_search', { p_query: query });
}

export interface AdminUserListItem {
  id: string;
  full_name: string;
  email: string | null;
  status: ProfileStatus;
  created_at: string;
  last_circle_activity: string | null;
  circle_count: number;
}

export async function listUsers(params: {
  search?: string;
  status?: ProfileStatus;
  page?: number;
  pageSize?: number;
}) {
  return rpc<Paginated<AdminUserListItem>>('admin_list_users', {
    p_search: params.search || null,
    p_status: params.status || null,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 25,
  });
}

export async function getUserDetail(userId: string) {
  return rpc('admin_get_user_detail', { p_user_id: userId });
}

export interface AdminCircleListItem {
  id: string;
  name: string;
  type: CircleType;
  created_at: string;
  archived_at: string | null;
  suspended_at: string | null;
  owner_name: string | null;
  member_count: number;
  task_count: number;
}

export async function listCircles(params: {
  search?: string;
  type?: CircleType;
  page?: number;
  pageSize?: number;
}) {
  return rpc<Paginated<AdminCircleListItem>>('admin_list_circles', {
    p_search: params.search || null,
    p_type: params.type || null,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 25,
  });
}

export async function getCircleDetail(circleId: string) {
  return rpc('admin_get_circle_detail', { p_circle_id: circleId });
}

export async function getTaskCompletionChain(taskId: string) {
  return rpc('admin_get_task_completion_chain', { p_task_id: taskId });
}

export interface AdminInvitationListItem {
  id: string;
  circle_id: string;
  circle_name: string;
  email: string | null;
  proposed_role: string;
  invited_by: string | null;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
}

export async function listInvitations(params: {
  circleId?: string;
  status?: InvitationStatus;
  page?: number;
  pageSize?: number;
}) {
  return rpc<Paginated<AdminInvitationListItem>>('admin_list_invitations', {
    p_circle_id: params.circleId || null,
    p_status: params.status || null,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 25,
  });
}

export interface AdminAuditLogListItem {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  admin_name: string;
  admin_email: string | null;
}

export async function listAuditLogs(params: { action?: string; targetType?: string; page?: number; pageSize?: number }) {
  return rpc<Paginated<AdminAuditLogListItem>>('admin_list_audit_logs', {
    p_action: params.action || null,
    p_target_type: params.targetType || null,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize ?? 50,
  });
}

export interface PlatformAdminListItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: PlatformRole;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  created_by_name: string | null;
}

export async function listPlatformAdmins() {
  return rpc<{ items: PlatformAdminListItem[] }>('admin_list_platform_admins');
}

export interface FeatureFlagItem {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

export async function listFeatureFlags() {
  return rpc<{ items: FeatureFlagItem[] }>('admin_list_feature_flags');
}

export async function getConfig() {
  return rpc<Record<string, unknown>>('admin_get_config');
}

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CircleType, PlatformRole } from '@/types/database';

async function callRpc<T = void>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function suspendUser(userId: string, reason: string) {
  await callRpc('admin_suspend_user', { p_user_id: userId, p_reason: reason });
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

export async function reactivateUser(userId: string, reason?: string) {
  await callRpc('admin_reactivate_user', { p_user_id: userId, p_reason: reason ?? null });
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

export async function updateUser(userId: string, fullName: string) {
  await callRpc('admin_update_user', { p_user_id: userId, p_full_name: fullName });
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

export async function deleteUser(userId: string, reason: string) {
  await callRpc('admin_delete_user', { p_user_id: userId, p_reason: reason });
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

export async function suspendCircle(circleId: string, reason: string) {
  await callRpc('admin_suspend_circle', { p_circle_id: circleId, p_reason: reason });
  revalidatePath(`/circles/${circleId}`);
  revalidatePath('/circles');
}

export async function reactivateCircle(circleId: string, reason?: string) {
  await callRpc('admin_reactivate_circle', { p_circle_id: circleId, p_reason: reason ?? null });
  revalidatePath(`/circles/${circleId}`);
  revalidatePath('/circles');
}

export async function updateCircle(circleId: string, name: string, type?: CircleType) {
  await callRpc('admin_update_circle', { p_circle_id: circleId, p_name: name, p_type: type ?? null });
  revalidatePath(`/circles/${circleId}`);
  revalidatePath('/circles');
}

export async function deleteCircle(circleId: string, reason: string) {
  await callRpc('admin_delete_circle', { p_circle_id: circleId, p_reason: reason });
  revalidatePath(`/circles/${circleId}`);
  revalidatePath('/circles');
}

export async function restoreCircle(circleId: string, reason?: string) {
  await callRpc('admin_restore_circle', { p_circle_id: circleId, p_reason: reason ?? null });
  revalidatePath(`/circles/${circleId}`);
  revalidatePath('/circles');
}

export async function adjustPoints(memberId: string, amount: number, reason: string, circleId: string) {
  await callRpc('admin_adjust_points', { p_member_id: memberId, p_amount: amount, p_reason: reason });
  revalidatePath(`/circles/${circleId}`);
}

export async function adjustProjectPoints(projectId: string, amount: number, reason: string, circleId: string) {
  await callRpc('admin_adjust_project_points', { p_project_id: projectId, p_amount: amount, p_reason: reason });
  revalidatePath(`/circles/${circleId}`);
}

export async function revokeInvitation(invitationId: string, reason?: string) {
  await callRpc('admin_revoke_invitation', { p_invitation_id: invitationId, p_reason: reason ?? null });
  revalidatePath('/invitations');
}

export async function resendInvitation(invitationId: string) {
  await callRpc('admin_resend_invitation', { p_invitation_id: invitationId });
  revalidatePath('/invitations');
}

export async function setPlatformRole(email: string, role: PlatformRole, isActive: boolean) {
  await callRpc('admin_set_platform_role', { p_target_email: email, p_role: role, p_is_active: isActive });
  revalidatePath('/administrators');
}

export async function setFeatureFlag(key: string, enabled: boolean, description?: string) {
  await callRpc('admin_set_feature_flag', { p_key: key, p_enabled: enabled, p_description: description ?? null });
  revalidatePath('/configuration');
}

export async function setConfig(key: string, value: unknown) {
  await callRpc('admin_set_config', { p_key: key, p_value: value });
  revalidatePath('/configuration');
}

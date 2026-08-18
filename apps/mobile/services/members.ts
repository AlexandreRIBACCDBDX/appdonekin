import { supabase } from '@/lib/supabase';
import type { CircleMember, GuardianRelationship, MemberType } from '@/types/database';

export async function fetchCircleMembers(circleId: string): Promise<CircleMember[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('*')
    .eq('circle_id', circleId)
    .is('archived_at', null)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchGuardianRelationships(circleId: string): Promise<GuardianRelationship[]> {
  const { data, error } = await supabase.from('guardian_relationships').select('*').eq('circle_id', circleId);
  if (error) throw error;
  return data ?? [];
}

export async function addCircleMember(params: {
  circleId: string;
  firstName: string;
  memberType: MemberType;
  birthDate?: string | null;
  hasPhone?: boolean;
  becomeGuardian?: boolean;
}): Promise<CircleMember> {
  const { data, error } = await supabase.rpc('add_circle_member', {
    p_circle_id: params.circleId,
    p_first_name: params.firstName,
    p_member_type: params.memberType,
    p_birth_date: params.birthDate ?? null,
    p_has_phone: params.hasPhone ?? false,
    p_become_guardian: params.becomeGuardian ?? true,
  });
  if (error) throw error;
  return data as CircleMember;
}

export async function updateMemberProfile(
  memberId: string,
  fields: Partial<Pick<CircleMember, 'first_name' | 'last_name' | 'avatar_url' | 'birth_date'>>
): Promise<void> {
  const { error } = await supabase.from('circle_members').update(fields).eq('id', memberId);
  if (error) throw error;
}

export async function setGuardianRelationship(params: {
  circleId: string;
  guardianMemberId: string;
  managedMemberId: string;
  canManageTasks?: boolean;
  canValidateTasks?: boolean;
  canManageRewards?: boolean;
  canEditProfile?: boolean;
}): Promise<GuardianRelationship> {
  const { data, error } = await supabase.rpc('set_guardian_relationship', {
    p_circle_id: params.circleId,
    p_guardian_member_id: params.guardianMemberId,
    p_managed_member_id: params.managedMemberId,
    p_can_manage_tasks: params.canManageTasks ?? true,
    p_can_validate_tasks: params.canValidateTasks ?? true,
    p_can_manage_rewards: params.canManageRewards ?? true,
    p_can_edit_profile: params.canEditProfile ?? true,
  });
  if (error) throw error;
  return data as GuardianRelationship;
}

export async function removeGuardianRelationship(id: string): Promise<void> {
  const { error } = await supabase.rpc('remove_guardian_relationship', { p_id: id });
  if (error) throw error;
}

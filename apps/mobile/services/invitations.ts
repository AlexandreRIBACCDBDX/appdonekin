import { supabase } from '@/lib/supabase';
import type { CircleMember, CircleRole, Invitation, MemberType } from '@/types/database';

export async function fetchInvitations(circleId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInvitation(params: {
  circleId: string;
  email?: string | null;
  role?: CircleRole;
  memberType?: MemberType;
  targetMemberId?: string | null;
}): Promise<Invitation> {
  const { data, error } = await supabase.rpc('create_invitation', {
    p_circle_id: params.circleId,
    p_email: params.email ?? null,
    p_role: params.role ?? 'member',
    p_member_type: params.memberType ?? 'friend',
    p_target_member_id: params.targetMemberId ?? null,
  });
  if (error) throw error;
  return data as Invitation;
}

export async function acceptInvitation(token: string): Promise<CircleMember> {
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw error;
  return data as CircleMember;
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_invitation', { p_invitation_id: id });
  if (error) throw error;
}

export async function joinCircleByCode(code: string): Promise<CircleMember> {
  const { data, error } = await supabase.rpc('join_circle_by_code', { p_code: code });
  if (error) throw error;
  return data as CircleMember;
}

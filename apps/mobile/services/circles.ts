import { supabase } from '@/lib/supabase';
import type { Circle, CircleMember, CircleType } from '@/types/database';

export async function fetchMyCircles(): Promise<Circle[]> {
  const { data, error } = await supabase
    .from('circles')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyMembershipForCircle(circleId: string): Promise<CircleMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('circle_members')
    .select('*')
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCircle(params: {
  name: string;
  type: CircleType;
  displayName: string;
}): Promise<Circle> {
  const { data, error } = await supabase.rpc('create_circle', {
    p_name: params.name,
    p_type: params.type,
    p_display_name: params.displayName,
  });
  if (error) throw error;
  return data as Circle;
}

export async function regenerateInviteCode(circleId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_circle_invite_code', { p_circle_id: circleId });
  if (error) throw error;
  return data as string;
}

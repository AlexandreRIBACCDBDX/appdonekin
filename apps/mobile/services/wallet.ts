import { supabase } from '@/lib/supabase';
import type { MemberWallet, PointTransaction } from '@/types/database';

export async function fetchWallet(memberId: string): Promise<MemberWallet> {
  const { data, error } = await supabase.from('member_wallets').select('*').eq('member_id', memberId).maybeSingle();
  if (error) throw error;
  return data ?? { member_id: memberId, circle_id: '', balance: 0, total_earned: 0, total_spent: 0 };
}

export async function fetchCircleWallets(circleId: string): Promise<MemberWallet[]> {
  const { data, error } = await supabase.from('member_wallets').select('*').eq('circle_id', circleId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPointHistory(memberId: string, limit = 50): Promise<PointTransaction[]> {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function transferPoints(params: {
  circleId: string;
  toMemberId: string;
  amount: number;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('transfer_points', {
    p_circle_id: params.circleId,
    p_to_member_id: params.toMemberId,
    p_amount: params.amount,
    p_note: params.note ?? null,
  });
  if (error) throw error;
}

export async function grantBonusPoints(params: {
  circleId: string;
  memberId: string;
  amount: number;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('grant_bonus_points', {
    p_circle_id: params.circleId,
    p_member_id: params.memberId,
    p_amount: params.amount,
    p_reason: params.reason ?? null,
  });
  if (error) throw error;
}

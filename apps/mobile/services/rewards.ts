import { supabase } from '@/lib/supabase';
import type { Reward, RewardRedemption } from '@/types/database';

export async function fetchRewards(circleId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('circle_id', circleId)
    .eq('is_active', true)
    .is('archived_at', null)
    .order('cost_points', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchRedemptions(circleId: string): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createReward(params: {
  circleId: string;
  createdByMemberId: string;
  name: string;
  description?: string | null;
  costPoints: number;
  icon?: string | null;
  requiresValidation?: boolean;
}): Promise<Reward> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const { data, error } = await supabase
    .from('rewards')
    .insert({
      circle_id: params.circleId,
      created_by_member_id: params.createdByMemberId,
      created_by_user_id: user.id,
      name: params.name,
      description: params.description ?? null,
      cost_points: params.costPoints,
      icon: params.icon ?? null,
      requires_validation: params.requiresValidation ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function redeemReward(rewardId: string, memberId: string): Promise<RewardRedemption> {
  const { data, error } = await supabase.rpc('redeem_reward', {
    p_reward_id: rewardId,
    p_member_id: memberId,
  });
  if (error) throw error;
  return data as RewardRedemption;
}

export async function validateRewardRedemption(redemptionId: string, approve: boolean): Promise<RewardRedemption> {
  const { data, error } = await supabase.rpc('validate_reward_redemption', {
    p_redemption_id: redemptionId,
    p_approve: approve,
  });
  if (error) throw error;
  return data as RewardRedemption;
}

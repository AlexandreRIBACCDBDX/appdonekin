import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createReward, fetchRedemptions, fetchRewards, redeemReward, validateRewardRedemption } from '@/services/rewards';

export function useRewards(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.rewards(circleId ?? 'none'),
    queryFn: () => fetchRewards(circleId as string),
    enabled: !!circleId,
  });
}

export function useRedemptions(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.redemptions(circleId ?? 'none'),
    queryFn: () => fetchRedemptions(circleId as string),
    enabled: !!circleId,
  });
}

export function useCreateReward(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      createdByMemberId: string;
      name: string;
      description?: string | null;
      costPoints: number;
      icon?: string | null;
      requiresValidation?: boolean;
    }) => createReward({ circleId, ...params }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rewards(circleId) }),
  });
}

function invalidateAfterRedemption(queryClient: ReturnType<typeof useQueryClient>, circleId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.redemptions(circleId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.circleWallets(circleId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.activity(circleId) });
  queryClient.invalidateQueries({ queryKey: ['wallet'] });
}

export function useRedeemReward(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { rewardId: string; memberId: string }) => redeemReward(params.rewardId, params.memberId),
    onSuccess: () => invalidateAfterRedemption(queryClient, circleId),
  });
}

export function useValidateRedemption(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { redemptionId: string; approve: boolean }) =>
      validateRewardRedemption(params.redemptionId, params.approve),
    onSuccess: () => invalidateAfterRedemption(queryClient, circleId),
  });
}

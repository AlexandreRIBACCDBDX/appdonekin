import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchCircleWallets, fetchPointHistory, fetchWallet, grantBonusPoints, transferPoints } from '@/services/wallet';

export function useWallet(memberId: string | null) {
  return useQuery({
    queryKey: queryKeys.wallet(memberId ?? 'none'),
    queryFn: () => fetchWallet(memberId as string),
    enabled: !!memberId,
  });
}

export function useCircleWallets(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.circleWallets(circleId ?? 'none'),
    queryFn: () => fetchCircleWallets(circleId as string),
    enabled: !!circleId,
  });
}

export function usePointHistory(memberId: string | null) {
  return useQuery({
    queryKey: queryKeys.pointHistory(memberId ?? 'none'),
    queryFn: () => fetchPointHistory(memberId as string),
    enabled: !!memberId,
  });
}

function invalidateWallets(queryClient: ReturnType<typeof useQueryClient>, circleId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.circleWallets(circleId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.activity(circleId) });
  queryClient.invalidateQueries({ queryKey: ['wallet'] });
}

export function useTransferPoints(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { toMemberId: string; amount: number; note?: string | null }) =>
      transferPoints({ circleId, ...params }),
    onSuccess: () => invalidateWallets(queryClient, circleId),
  });
}

export function useGrantBonusPoints(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { memberId: string; amount: number; reason?: string | null }) =>
      grantBonusPoints({ circleId, ...params }),
    onSuccess: () => invalidateWallets(queryClient, circleId),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { createCircle, fetchMyCircles, fetchMyMembershipForCircle, regenerateInviteCode } from '@/services/circles';
import type { CircleType } from '@/types/database';

export function useMyCircles() {
  return useQuery({ queryKey: queryKeys.circles, queryFn: fetchMyCircles });
}

export function useMyMembership(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.myMembership(circleId ?? 'none'),
    queryFn: () => fetchMyMembershipForCircle(circleId as string),
    enabled: !!circleId,
  });
}

export function useCreateCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; type: CircleType; displayName: string }) => createCircle(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.circles });
    },
  });
}

export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (circleId: string) => regenerateInviteCode(circleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
  });
}

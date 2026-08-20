import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { acceptInvitation, createInvitation, fetchInvitations, joinCircleByCode, revokeInvitation } from '@/services/invitations';
import type { CircleRole, MemberType } from '@/types/database';

export function useInvitations(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.invitations(circleId ?? 'none'),
    queryFn: () => fetchInvitations(circleId as string),
    enabled: !!circleId,
  });
}

export function useCreateInvitation(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { email?: string | null; role?: CircleRole; memberType?: MemberType; targetMemberId?: string | null }) =>
      createInvitation({ circleId, ...params }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations(circleId) }),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptInvitation(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
  });
}

export function useJoinCircleByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => joinCircleByCode(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.circles }),
  });
}

export function useRevokeInvitation(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations(circleId) }),
  });
}

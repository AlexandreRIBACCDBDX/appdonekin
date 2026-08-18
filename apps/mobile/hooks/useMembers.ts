import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  addCircleMember,
  fetchCircleMembers,
  fetchGuardianRelationships,
  removeGuardianRelationship,
  setGuardianRelationship,
  updateMemberProfile,
} from '@/services/members';
import type { CircleMember, MemberType } from '@/types/database';

export function useCircleMembers(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.members(circleId ?? 'none'),
    queryFn: () => fetchCircleMembers(circleId as string),
    enabled: !!circleId,
  });
}

export function useGuardianRelationships(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.guardianRelationships(circleId ?? 'none'),
    queryFn: () => fetchGuardianRelationships(circleId as string),
    enabled: !!circleId,
  });
}

export function useAddCircleMember(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      firstName: string;
      memberType: MemberType;
      birthDate?: string | null;
      hasPhone?: boolean;
      becomeGuardian?: boolean;
    }) => addCircleMember({ circleId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianRelationships(circleId) });
    },
  });
}

export function useUpdateMemberProfile(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { memberId: string; fields: Partial<CircleMember> }) =>
      updateMemberProfile(params.memberId, params.fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(circleId) });
    },
  });
}

export function useSetGuardianRelationship(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      guardianMemberId: string;
      managedMemberId: string;
      canManageTasks?: boolean;
      canValidateTasks?: boolean;
      canManageRewards?: boolean;
      canEditProfile?: boolean;
    }) => setGuardianRelationship({ circleId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianRelationships(circleId) });
    },
  });
}

export function useRemoveGuardianRelationship(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeGuardianRelationship(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardianRelationships(circleId) });
    },
  });
}

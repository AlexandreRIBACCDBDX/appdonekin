import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  addProjectMember,
  castPromiseVote,
  completeProject,
  contributeToProject,
  createProject,
  fetchProjectMembers,
  fetchProjectTasks,
  fetchProjectWallet,
  fetchProjects,
  fetchPromiseVotes,
  removeProjectMember,
} from '@/services/projects';

export function useProjects(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects(circleId ?? 'none'),
    queryFn: () => fetchProjects(circleId as string),
    enabled: !!circleId,
  });
}

export function useProjectTasks(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectTasks(projectId ?? 'none'),
    queryFn: () => fetchProjectTasks(projectId as string),
    enabled: !!projectId,
  });
}

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectMembers(projectId ?? 'none'),
    queryFn: () => fetchProjectMembers(projectId as string),
    enabled: !!projectId,
  });
}

export function useProjectWallet(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectWallet(projectId ?? 'none'),
    queryFn: () => fetchProjectWallet(projectId as string),
    enabled: !!projectId,
  });
}

export function usePromiseVotes(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.promiseVotes(projectId ?? 'none'),
    queryFn: () => fetchPromiseVotes(projectId as string),
    enabled: !!projectId,
  });
}

export function useCreateProject(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      createdByMemberId: string;
      title: string;
      description?: string | null;
      dueDate?: string | null;
      promiseDescription?: string | null;
      targetPoints?: number | null;
    }) => createProject({ circleId, ...params }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects(circleId) }),
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => addProjectMember(projectId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) }),
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeProjectMember(projectId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) }),
  });
}

export function useCastPromiseVote(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (confirmed: boolean) => castPromiseVote(projectId, confirmed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.promiseVotes(projectId) }),
  });
}

export function useCompleteProject(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => completeProject(projectId),
    onSuccess: (_data, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.circleWallets(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(circleId) });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectWallet(projectId) });
    },
  });
}

export function useContributeToProject(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { projectId: string; amount: number; note?: string }) =>
      contributeToProject(params.projectId, params.amount, params.note),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectWallet(params.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(params.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.circleWallets(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(circleId) });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

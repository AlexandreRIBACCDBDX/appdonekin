import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  cancelTask,
  completeTask,
  createTask,
  fetchPendingValidations,
  fetchTask,
  fetchTaskCompletions,
  fetchTasks,
  updateTask,
  validateTaskCompletion,
} from '@/services/tasks';
import type { RecurrenceFrequency, Task, TaskPriority } from '@/types/database';

export function useTasks(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks(circleId ?? 'none'),
    queryFn: () => fetchTasks(circleId as string),
    enabled: !!circleId,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.task(taskId ?? 'none'),
    queryFn: () => fetchTask(taskId as string),
    enabled: !!taskId,
  });
}

export function useTaskCompletions(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.taskCompletions(taskId ?? 'none'),
    queryFn: () => fetchTaskCompletions(taskId as string),
    enabled: !!taskId,
  });
}

export function usePendingValidations(circleId: string | null) {
  return useQuery({
    queryKey: queryKeys.pendingValidations(circleId ?? 'none'),
    queryFn: () => fetchPendingValidations(circleId as string),
    enabled: !!circleId,
    refetchInterval: 30_000,
  });
}

function invalidateAfterPointsChange(queryClient: ReturnType<typeof useQueryClient>, circleId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks(circleId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.pendingValidations(circleId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.circleWallets(circleId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.activity(circleId) });
  queryClient.invalidateQueries({ queryKey: ['wallet'] });
}

export function useCreateTask(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      title: string;
      assignedToMemberId: string;
      description?: string | null;
      points?: number;
      priority?: TaskPriority;
      dueDate?: string | null;
      projectId?: string | null;
      recurrence?: RecurrenceFrequency;
    }) => createTask({ circleId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(circleId) });
    },
  });
}

export function useUpdateTask(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; fields: Partial<Task> }) => updateTask(params.taskId, params.fields),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(circleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.taskId) });
    },
  });
}

export function useCancelTask(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => cancelTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(circleId) });
    },
  });
}

export function useCompleteTask(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      taskId: string;
      performedByMemberId: string;
      notes?: string | null;
      sharedWithMemberIds?: string[] | null;
    }) => completeTask(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskCompletions(variables.taskId) });
      invalidateAfterPointsChange(queryClient, circleId);
    },
  });
}

export function useValidateTaskCompletion(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { completionId: string; approve: boolean; notes?: string | null }) =>
      validateTaskCompletion(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.task(data.task_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskCompletions(data.task_id) });
      invalidateAfterPointsChange(queryClient, circleId);
    },
  });
}

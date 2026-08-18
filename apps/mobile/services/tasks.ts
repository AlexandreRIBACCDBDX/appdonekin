import { supabase } from '@/lib/supabase';
import type { Task, TaskCompletion, TaskPriority, RecurrenceFrequency } from '@/types/database';

export async function fetchTasks(circleId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('circle_id', circleId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTask(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('task_id', taskId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPendingValidations(circleId: string): Promise<TaskCompletion[]> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('circle_id', circleId)
    .eq('status', 'pending_validation')
    .order('submitted_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTask(params: {
  circleId: string;
  title: string;
  assignedToMemberId: string;
  description?: string | null;
  // Ignored by the server for a self-assigned task — always pays 0.5 pt,
  // no validation step. Only takes effect when assigning someone else.
  points?: number;
  priority?: TaskPriority;
  dueDate?: string | null;
  projectId?: string | null;
  recurrence?: RecurrenceFrequency;
}): Promise<Task> {
  const { data, error } = await supabase.rpc('create_task', {
    p_circle_id: params.circleId,
    p_title: params.title,
    p_assigned_to_member_id: params.assignedToMemberId,
    p_description: params.description ?? null,
    p_points: params.points ?? 0,
    p_priority: params.priority ?? 'medium',
    p_due_date: params.dueDate ?? null,
    p_project_id: params.projectId ?? null,
    p_recurrence: params.recurrence ?? 'none',
  });
  if (error) throw error;
  return data as Task;
}

export async function updateTask(taskId: string, fields: Partial<Task>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', taskId);
  if (error) throw error;
}

export async function cancelTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
  if (error) throw error;
}

export async function completeTask(params: {
  taskId: string;
  performedByMemberId: string;
  notes?: string | null;
}): Promise<TaskCompletion> {
  const { data, error } = await supabase.rpc('complete_task', {
    p_task_id: params.taskId,
    p_performed_by_member_id: params.performedByMemberId,
    p_notes: params.notes ?? null,
  });
  if (error) throw error;
  return data as TaskCompletion;
}

export async function validateTaskCompletion(params: {
  completionId: string;
  approve: boolean;
  notes?: string | null;
}): Promise<TaskCompletion> {
  const { data, error } = await supabase.rpc('validate_task_completion', {
    p_completion_id: params.completionId,
    p_approve: params.approve,
    p_notes: params.notes ?? null,
  });
  if (error) throw error;
  return data as TaskCompletion;
}

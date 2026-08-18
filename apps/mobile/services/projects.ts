import { supabase } from '@/lib/supabase';
import type { Project, ProjectMember, ProjectPromiseVote, ProjectWallet, Task } from '@/types/database';

export async function fetchProjects(circleId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('circle_id', circleId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase.from('project_members').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectWallet(projectId: string): Promise<ProjectWallet> {
  const { data, error } = await supabase.from('project_wallets').select('*').eq('project_id', projectId).maybeSingle();
  if (error) throw error;
  return data ?? { project_id: projectId, balance: 0 };
}

export async function fetchPromiseVotes(projectId: string): Promise<ProjectPromiseVote[]> {
  const { data, error } = await supabase.from('project_promise_votes').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data ?? [];
}

export async function createProject(params: {
  circleId: string;
  createdByMemberId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  promiseDescription?: string | null;
  targetPoints?: number | null;
}): Promise<Project> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      circle_id: params.circleId,
      created_by_member_id: params.createdByMemberId,
      created_by_user_id: user.id,
      title: params.title,
      description: params.description ?? null,
      due_date: params.dueDate ?? null,
      promise_description: params.promiseDescription ?? null,
      target_points: params.targetPoints ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Membership beyond auto-sync (project creator, task assignees): lets the
// creator/admin pull in someone who isn't tied to any task yet, e.g. to
// have them share in the +5 completion bonus or vote on the promise.
export async function addProjectMember(projectId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, member_id: memberId });
  if (error) throw error;
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('member_id', memberId);
  if (error) throw error;
}

export async function castPromiseVote(projectId: string, confirmed: boolean): Promise<ProjectPromiseVote> {
  const { data, error } = await supabase.rpc('cast_promise_vote', { p_project_id: projectId, p_confirmed: confirmed });
  if (error) throw error;
  return data as ProjectPromiseVote;
}

export async function completeProject(projectId: string): Promise<{ promise_kept: boolean }> {
  const { data, error } = await supabase.rpc('complete_project', { p_project_id: projectId });
  if (error) throw error;
  return data as { promise_kept: boolean };
}

// Progress is Dones-based, not task-count-based: when the project has a
// Dones target, it's the project wallet balance against that target; with
// no target set, it falls back to (Dones of completed tasks) / (Dones of
// all tasks) — still points, never a raw task count.
export function projectProgress(
  tasks: Task[],
  goal?: { targetPoints?: number | null; walletBalance?: number }
) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'completed').length;

  let donesDone: number;
  let donesTotal: number;
  if (goal?.targetPoints) {
    donesDone = goal.walletBalance ?? 0;
    donesTotal = goal.targetPoints;
  } else {
    donesTotal = tasks.reduce((sum, t) => sum + t.points, 0);
    donesDone = tasks.filter((t) => t.status === 'completed').reduce((sum, t) => sum + t.points, 0);
  }
  const percent = donesTotal === 0 ? 0 : Math.round(Math.min(donesDone / donesTotal, 1) * 100);

  return { total, done, percent, donesDone, donesTotal };
}

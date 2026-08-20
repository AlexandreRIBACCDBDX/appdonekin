import { notFound } from 'next/navigation';
import { getCircleDetail } from '@/lib/data';
import { Badge, statusTone } from '@/components/Badge';
import { CircleActions } from '@/components/CircleActions';
import { EditCircleForm } from '@/components/EditCircleForm';
import { AdjustPointsForm } from '@/components/AdjustPointsForm';
import { AdjustProjectPointsForm } from '@/components/AdjustProjectPointsForm';
import { RedemptionActions } from '@/components/RedemptionActions';
import { InvitationActions } from '@/components/InvitationActions';
import { TaskChainLookup } from '@/components/TaskChainLookup';
import type { Circle } from '@/types/database';

interface CircleMemberDetail {
  id: string;
  first_name: string;
  last_name: string | null;
  role: string;
  member_type: string;
  access_mode: 'personal_account' | 'guardian_managed';
  has_phone: boolean;
  user_id: string | null;
  linked_email: string | null;
  guardians: { member_id: string; first_name: string }[];
  balance: number;
  self_task_cap_hits_7d: number;
}

interface CircleProjectDetail {
  id: string;
  title: string;
  status: string;
  target_points: number | null;
  balance: number;
}

interface CircleRewardDetail {
  id: string;
  name: string;
  cost_points: number;
  is_active: boolean;
}

interface CircleRedemptionDetail {
  id: string;
  reward_name: string;
  member_name: string;
  status: string;
  points_spent: number;
  created_at: string;
}

interface CircleDetail {
  circle: Circle;
  members: CircleMemberDetail[];
  projects: CircleProjectDetail[];
  rewards: CircleRewardDetail[];
  redemptions: CircleRedemptionDetail[];
  projects_count: number;
  tasks_count: number;
  tasks_completed_count: number;
  rewards_count: number;
  point_transactions_count: number;
  pending_invitations: { id: string; email: string | null; expires_at: string }[];
  recent_activity: { type: string; points: number | null; metadata: Record<string, unknown>; created_at: string }[];
}

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail: CircleDetail;
  try {
    detail = (await getCircleDetail(id)) as unknown as CircleDetail;
  } catch (err) {
    if (err instanceof Error && err.message.includes('circle_not_found')) {
      notFound();
    }
    throw err;
  }

  const {
    circle,
    members,
    projects,
    rewards,
    redemptions,
    projects_count,
    tasks_count,
    tasks_completed_count,
    rewards_count,
    pending_invitations,
    recent_activity,
  } = detail!;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{circle.name}</h1>
          <p className="text-sm text-slate-500">
            {circle.type} • créé le {new Date(circle.created_at).toLocaleDateString()}
          </p>
        </div>
        {circle.suspended_at ? (
          <Badge label="Suspendu" tone="danger" />
        ) : circle.archived_at ? (
          <Badge label="Archivé" tone="neutral" />
        ) : (
          <Badge label="Actif" tone="success" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Membres</p>
          <p className="text-slate-700">{members.length}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Projets</p>
          <p className="text-slate-700">{projects_count}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Tâches</p>
          <p className="text-slate-700">
            {tasks_completed_count} / {tasks_count} terminées
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Récompenses</p>
          <p className="text-slate-700">{rewards_count}</p>
        </div>
      </div>

      <div>
        <CircleActions circleId={circle.id} suspended={!!circle.suspended_at} archived={!!circle.archived_at} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Modifier</h2>
        <EditCircleForm circleId={circle.id} initialName={circle.name} initialType={circle.type} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Membres</h2>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">
                  {m.first_name} {m.last_name ?? ''}
                </p>
                <p className="text-xs text-slate-500">
                  {m.role} • {m.member_type}
                </p>
              </div>
              <div className="text-right">
                {m.access_mode === 'personal_account' ? (
                  <Badge label={`Compte personnel${m.linked_email ? ` — ${m.linked_email}` : ''}`} tone="info" />
                ) : (
                  <div>
                    <Badge label="Profil géré" tone="neutral" />
                    {m.guardians.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Responsables : {m.guardians.map((g) => g.first_name).join(', ')}
                      </p>
                    ) : null}
                  </div>
                )}
                <p className="mt-1 text-xs font-medium text-amber-600">{m.balance} pts</p>
                {m.self_task_cap_hits_7d > 0 ? (
                  <p className="mt-1 text-xs text-orange-600">
                    ⚠ {m.self_task_cap_hits_7d} tâche{m.self_task_cap_hits_7d > 1 ? 's' : ''} perso plafonnée
                    {m.self_task_cap_hits_7d > 1 ? 's' : ''} (7j)
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Ajuster des points (manuel, audité)</h2>
        <AdjustPointsForm circleId={circle.id} members={members.map((m) => ({ id: m.id, first_name: m.first_name }))} />
      </div>

      {projects.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Projets</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{p.title}</p>
                  <p className="text-xs text-slate-500">{p.status}</p>
                </div>
                <p className="text-xs font-medium text-amber-600">
                  {p.balance} {p.target_points ? `/ ${p.target_points}` : ''} pts
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Ajuster les points d&apos;un projet (réclamation, correction)
        </h2>
        <AdjustProjectPointsForm circleId={circle.id} projects={projects.map((p) => ({ id: p.id, title: p.title }))} />
      </div>

      {rewards.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Récompenses</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{r.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-amber-600">{r.cost_points} pts</span>
                  <Badge label={r.is_active ? 'Active' : 'Désactivée'} tone={r.is_active ? 'success' : 'neutral'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {redemptions.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Rédemptions récentes</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {redemptions.map((rd) => (
              <div key={rd.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">
                    {rd.member_name} → {rd.reward_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rd.points_spent} pts • {new Date(rd.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={rd.status} tone={statusTone(rd.status)} />
                  {rd.status === 'approved' ? (
                    <RedemptionActions redemptionId={rd.id} circleId={circle.id} />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {pending_invitations.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Invitations en cours</h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {pending_invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-slate-800">{inv.email ?? 'Sans email'}</p>
                  <p className="text-xs text-slate-400">Expire le {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                <InvitationActions invitationId={inv.id} status="pending" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Activité récente</h2>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {recent_activity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">Aucune activité récente.</p>
          ) : (
            recent_activity.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-700">{a.type}</span>
                <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <TaskChainLookup />
    </div>
  );
}

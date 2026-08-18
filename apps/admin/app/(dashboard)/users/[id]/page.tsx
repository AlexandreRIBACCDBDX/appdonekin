import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getUserDetail } from '@/lib/data';
import { Badge, statusTone } from '@/components/Badge';
import { UserActions } from '@/components/UserActions';
import type { Profile } from '@/types/database';

interface UserDetail {
  profile: Profile;
  memberships: {
    member_id: string;
    circle_id: string;
    circle_name: string;
    circle_type: string;
    role: string;
    member_type: string;
    joined_at: string;
  }[];
  invitations_sent: number;
  tasks_created: number;
  recent_admin_actions: { action: string; reason: string | null; created_at: string }[];
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail: UserDetail;
  try {
    detail = (await getUserDetail(id)) as unknown as UserDetail;
  } catch {
    notFound();
  }

  const { profile, memberships, invitations_sent, tasks_created, recent_admin_actions } = detail!;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{profile.full_name}</h1>
          <p className="text-sm text-slate-500">{profile.email}</p>
        </div>
        <Badge label={profile.status} tone={statusTone(profile.status)} />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">ID</p>
          <p className="truncate font-mono text-xs text-slate-700">{profile.id}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Créé le</p>
          <p className="text-slate-700">{new Date(profile.created_at).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Tâches créées</p>
          <p className="text-slate-700">{tasks_created}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Invitations envoyées</p>
          <p className="text-slate-700">{invitations_sent}</p>
        </div>
      </div>

      <div>
        <UserActions userId={profile.id} status={profile.status} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Cercles</h2>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {memberships.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">Aucun cercle.</p>
          ) : (
            memberships.map((m) => (
              <Link
                key={m.member_id}
                href={`/circles/${m.circle_id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{m.circle_name}</span>
                <span className="text-slate-500">
                  {m.role} • {m.circle_type}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Historique administratif</h2>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {recent_admin_actions.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">Aucune action administrative sur ce compte.</p>
          ) : (
            recent_admin_actions.map((a, i) => (
              <div key={i} className="px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{a.action}</p>
                {a.reason ? <p className="text-slate-500">{a.reason}</p> : null}
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

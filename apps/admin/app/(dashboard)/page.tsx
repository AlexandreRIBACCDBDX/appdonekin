import Link from 'next/link';
import { getDashboardStats } from '@/lib/data';
import { StatCard } from '@/components/StatCard';

const PERIODS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = '7d' } = await searchParams;
  const stats = (await getDashboardStats(period)) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/?period=${p.value}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p.value === period ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vue d&apos;ensemble</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Utilisateurs" value={stats.users_total ?? 0} />
          <StatCard label="Cercles" value={stats.circles_total ?? 0} />
          <StatCard label="Membres" value={stats.members_total ?? 0} />
          <StatCard label="Nouveaux comptes aujourd'hui" value={stats.new_accounts_today ?? 0} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sur la période sélectionnée
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Nouveaux comptes" value={stats.new_accounts_period ?? 0} />
          <StatCard label="Nouveaux cercles" value={stats.new_circles_period ?? 0} />
          <StatCard label="Utilisateurs actifs" value={stats.active_users_period ?? 0} />
          <StatCard label="Tâches créées" value={stats.tasks_created_period ?? 0} />
          <StatCard label="Tâches terminées" value={stats.tasks_completed_period ?? 0} />
          <StatCard label="Points dépensés en récompenses" value={stats.points_redeemed_period ?? 0} />
          <StatCard label="Tâches perso plafonnées (anti-abus)" value={stats.self_task_cap_hits_period ?? 0} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Depuis toujours</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
          <StatCard label="Tâches créées" value={stats.tasks_created_total ?? 0} />
          <StatCard label="Tâches terminées" value={stats.tasks_completed_total ?? 0} />
        </div>
      </div>
    </div>
  );
}

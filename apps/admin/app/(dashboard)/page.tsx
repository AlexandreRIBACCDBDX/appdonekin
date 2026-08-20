import Link from 'next/link';
import { getDashboardStats, getDashboardTimeseries, type DashboardTimeseriesPoint } from '@/lib/data';
import { StatCard } from '@/components/StatCard';
import { TrendChart } from '@/components/TrendChart';
import { BreakdownBarChart } from '@/components/BreakdownBarChart';
import { ComparisonBarChart } from '@/components/ComparisonBarChart';

const PERIODS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
];

const CIRCLE_TYPE_LABELS: Record<string, string> = {
  family: 'Famille',
  friends: 'Amis',
  couple: 'Couple',
  roommates: 'Colocs',
  other: 'Autre',
};

interface DashboardStats {
  users_total: number;
  circles_total: number;
  members_total: number;
  new_accounts_today: number;
  new_accounts_period: number;
  new_circles_period: number;
  active_users_period: number;
  tasks_created_period: number;
  tasks_completed_period: number;
  points_redeemed_period: number;
  self_task_cap_hits_period: number;
  tasks_created_total: number;
  tasks_completed_total: number;
  circles_by_type: Record<string, number>;
}

function ChartCard({
  title,
  value,
  children,
}: {
  title: string;
  value?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {value != null ? <span className="text-lg font-semibold text-slate-900">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = '7d' } = await searchParams;
  const [statsRaw, timeseriesRaw] = await Promise.all([getDashboardStats(period), getDashboardTimeseries(period)]);
  const stats = statsRaw as unknown as DashboardStats;
  const timeseries = timeseriesRaw as unknown as Record<string, string | number>[];

  const circlesByType = Object.entries(stats.circles_by_type ?? {}).map(([type, count]) => ({
    label: CIRCLE_TYPE_LABELS[type] ?? type,
    value: count,
  }));

  const periodLabel = PERIODS.find((p) => p.value === period)?.label;
  // new_members has no matching total in admin_get_dashboard_stats (unlike
  // the other metrics, which already carry a _period aggregate) — sum it
  // from the same daily series feeding the chart instead of a second query.
  const newMembersPeriod = timeseries.reduce((sum, t) => sum + (Number(t.new_members) || 0), 0);

  // Every metric gets the same full-size treatment as the original "Tendance"
  // chart — one TrendChart per metric, single series, same component.
  const METRIC_CHARTS: { key: keyof DashboardTimeseriesPoint; title: string; value: number; color: string }[] = [
    { key: 'new_accounts', title: 'Nouveaux comptes', value: stats.new_accounts_period ?? 0, color: '#6366f1' },
    { key: 'new_circles', title: 'Nouveaux cercles', value: stats.new_circles_period ?? 0, color: '#0ea5e9' },
    { key: 'new_members', title: 'Nouveaux membres', value: newMembersPeriod, color: '#14b8a6' },
    { key: 'tasks_created', title: 'Tâches créées', value: stats.tasks_created_period ?? 0, color: '#f59e0b' },
    { key: 'tasks_completed', title: 'Tâches terminées', value: stats.tasks_completed_period ?? 0, color: '#10b981' },
    { key: 'active_users', title: 'Utilisateurs actifs', value: stats.active_users_period ?? 0, color: '#8b5cf6' },
    { key: 'points_redeemed', title: 'Points dépensés en récompenses', value: stats.points_redeemed_period ?? 0, color: '#eab308' },
    { key: 'self_task_cap_hits', title: 'Tâches perso plafonnées (anti-abus)', value: stats.self_task_cap_hits_period ?? 0, color: '#ef4444' },
  ];

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
          Tendances sur la période ({periodLabel})
        </h2>
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Vue combinée</h3>
          <TrendChart
            data={timeseries}
            xKey="day"
            series={[
              { key: 'new_accounts', label: 'Nouveaux comptes', color: '#6366f1' },
              { key: 'tasks_created', label: 'Tâches créées', color: '#f59e0b' },
              { key: 'tasks_completed', label: 'Tâches terminées', color: '#10b981' },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {METRIC_CHARTS.map((m) => (
            <ChartCard key={m.key} title={m.title} value={m.value}>
              <TrendChart data={timeseries} xKey="day" series={[{ key: m.key, label: m.title, color: m.color }]} height={160} />
            </ChartCard>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Cercles par type">
          <BreakdownBarChart data={circlesByType} />
        </ChartCard>
        <ChartCard title="Depuis toujours">
          <ComparisonBarChart
            items={[
              { label: 'Tâches créées', value: stats.tasks_created_total ?? 0, color: '#f59e0b' },
              { label: 'Tâches terminées', value: stats.tasks_completed_total ?? 0, color: '#10b981' },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { listUsers } from '@/lib/data';
import { Badge, statusTone } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import type { ProfileStatus } from '@/types/database';

const STATUS_LABELS: Record<ProfileStatus, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  disabled: 'Désactivé',
  deleted: 'Supprimé',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const status = (params.status as ProfileStatus) || undefined;

  const { items, total, page_size } = await listUsers({ search: params.q, status, page });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Utilisateurs</h1>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Rechercher par nom ou email..."
          className="w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={params.status ?? ''} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Filtrer
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3">Cercles</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/users/${u.id}`} className="font-medium text-indigo-600 hover:underline">
                    {u.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{u.circle_count}</td>
                <td className="px-4 py-3">
                  <Badge label={STATUS_LABELS[u.status]} tone={statusTone(u.status)} />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination page={page} pageSize={page_size} total={total} basePath="/users" searchParams={params} />
      </div>
    </div>
  );
}

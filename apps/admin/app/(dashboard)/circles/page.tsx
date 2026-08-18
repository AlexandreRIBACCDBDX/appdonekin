import Link from 'next/link';
import { listCircles } from '@/lib/data';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import type { CircleType } from '@/types/database';

const TYPE_LABELS: Record<CircleType, string> = {
  family: 'Famille',
  friends: 'Amis',
  couple: 'Couple',
  roommates: 'Colocation',
  other: 'Autre',
};

export default async function CirclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const type = (params.type as CircleType) || undefined;

  const { items, total, page_size } = await listCircles({ search: params.q, type, page });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Cercles</h1>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Rechercher par nom..."
          className="w-72 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select name="type" defaultValue={params.type ?? ''} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
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
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Membres</th>
              <th className="px-4 py-3">Tâches</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/circles/${c.id}`} className="font-medium text-indigo-600 hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[c.type]}</td>
                <td className="px-4 py-3 text-slate-600">{c.owner_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.member_count}</td>
                <td className="px-4 py-3 text-slate-500">{c.task_count}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {c.suspended_at ? (
                    <Badge label="Suspendu" tone="danger" />
                  ) : c.archived_at ? (
                    <Badge label="Archivé" tone="neutral" />
                  ) : (
                    <Badge label="Actif" tone="success" />
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Aucun cercle trouvé.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination page={page} pageSize={page_size} total={total} basePath="/circles" searchParams={params} />
      </div>
    </div>
  );
}

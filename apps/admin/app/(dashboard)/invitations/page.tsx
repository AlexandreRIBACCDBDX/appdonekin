import Link from 'next/link';
import { listInvitations } from '@/lib/data';
import { Badge, statusTone } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { InvitationActions } from '@/components/InvitationActions';
import type { InvitationStatus } from '@/types/database';

const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  declined: 'Refusée',
  expired: 'Expirée',
  revoked: 'Révoquée',
};

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const status = (params.status as InvitationStatus) || undefined;

  const { items, total, page_size } = await listInvitations({ status, page });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Invitations</h1>

      <form className="flex gap-2">
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Cercle</th>
              <th className="px-4 py-3">Invité par</th>
              <th className="px-4 py-3">Rôle proposé</th>
              <th className="px-4 py-3">Créée le</th>
              <th className="px-4 py-3">Expiration</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{inv.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link href={`/circles/${inv.circle_id}`} className="text-indigo-600 hover:underline">
                    {inv.circle_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{inv.invited_by ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{inv.proposed_role}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(inv.expires_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Badge label={STATUS_LABELS[inv.status]} tone={statusTone(inv.status)} />
                </td>
                <td className="px-4 py-3">
                  <InvitationActions invitationId={inv.id} status={inv.status} />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Aucune invitation trouvée.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination page={page} pageSize={page_size} total={total} basePath="/invitations" searchParams={params} />
      </div>
    </div>
  );
}

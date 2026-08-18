import { listAuditLogs } from '@/lib/data';
import { Pagination } from '@/components/Pagination';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const { items, total, page_size } = await listAuditLogs({ action: params.action, page });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>
      <p className="text-sm text-slate-500">
        Trace immuable de toute action administrative sensible — jamais modifiable depuis ce back office.
      </p>

      <form className="flex gap-2">
        <input
          type="text"
          name="action"
          defaultValue={params.action}
          placeholder="Filtrer par action (ex: USER_SUSPENDED)"
          className="w-80 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Filtrer
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Cible</th>
              <th className="px-4 py-3">Motif</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-700">{log.admin_email ?? log.admin_name}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{log.action}</code>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {log.target_type ? `${log.target_type} · ${log.target_id}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{log.reason ?? '—'}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aucun log trouvé.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Pagination page={page} pageSize={page_size} total={total} basePath="/audit-logs" searchParams={params} />
      </div>
    </div>
  );
}

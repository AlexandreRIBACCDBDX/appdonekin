import { listPlatformAdmins } from '@/lib/data';
import { Badge } from '@/components/Badge';
import { SetAdminRoleForm } from '@/components/SetAdminRoleForm';
import { ToggleAdminActiveButton } from '@/components/ToggleAdminActiveButton';

export default async function AdministratorsPage() {
  let items: Awaited<ReturnType<typeof listPlatformAdmins>>['items'] = [];
  let denied = false;

  try {
    const result = await listPlatformAdmins();
    items = result.items;
  } catch {
    denied = true;
  }

  if (denied) {
    return (
      <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Seul un Super Admin peut gérer les administrateurs DoneKin.
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Administrateurs</h1>
      <p className="text-sm text-slate-500">
        Rôles plateforme DoneKin — entièrement séparés des rôles de cercle (owner/parent/membre). Un parent
        propriétaire d&apos;un cercle n&apos;a ici aucun privilège.
      </p>

      <SetAdminRoleForm />

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.map((admin) => (
          <div key={admin.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-800">{admin.full_name}</p>
              <p className="text-xs text-slate-500">{admin.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge label={admin.role} tone={admin.is_active ? 'info' : 'neutral'} />
              {!admin.is_active ? <Badge label="Inactif" tone="danger" /> : null}
              <ToggleAdminActiveButton email={admin.email ?? ''} role={admin.role} isActive={admin.is_active} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

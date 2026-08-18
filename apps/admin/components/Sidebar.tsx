'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PlatformRole } from '@/types/database';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/users', label: 'Utilisateurs', icon: '👤' },
  { href: '/circles', label: 'Cercles', icon: '🔵' },
  { href: '/invitations', label: 'Invitations', icon: '✉️' },
  { href: '/audit-logs', label: 'Audit Logs', icon: '🧾', roles: ['super_admin', 'admin'] as PlatformRole[] },
  { href: '/administrators', label: 'Administrateurs', icon: '🛡️', roles: ['super_admin'] as PlatformRole[] },
  { href: '/configuration', label: 'Configuration', icon: '⚙️', roles: ['super_admin', 'admin'] as PlatformRole[] },
];

export function Sidebar({ role }: { role: PlatformRole }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-slate-950 text-slate-300">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-xl">🤝</span>
        <span className="text-sm font-semibold text-white">DoneKin Admin</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? 'bg-slate-800 text-white' : 'hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-xs text-slate-500">Rôle : {role}</div>
    </aside>
  );
}

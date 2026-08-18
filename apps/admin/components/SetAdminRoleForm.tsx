'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPlatformRole } from '@/lib/actions';
import type { PlatformRole } from '@/types/database';

const ROLES: PlatformRole[] = ['super_admin', 'admin', 'support', 'moderator', 'read_only'];

export function SetAdminRoleForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformRole>('support');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    if (!window.confirm(`Donner le rôle "${role}" à ${email} ?`)) return;

    startTransition(async () => {
      try {
        await setPlatformRole(email.trim(), role, true);
        setEmail('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur.');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Email du compte DoneKin</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="nouveau.admin@donekin.app"
          className="w-64 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as PlatformRole)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        Attribuer
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </form>
  );
}

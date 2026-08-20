'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/lib/actions';

export function EditUserNameForm({ userId, initialFullName }: { userId: string; initialFullName: string }) {
  const [fullName, setFullName] = useState(initialFullName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Le nom ne peut pas être vide.');
      return;
    }
    startTransition(async () => {
      try {
        await updateUser(userId, fullName.trim());
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur.');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs text-slate-500">Nom complet</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || fullName.trim() === initialFullName}
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        Enregistrer
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </form>
  );
}

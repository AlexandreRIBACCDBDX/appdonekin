'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCircle } from '@/lib/actions';
import type { CircleType } from '@/types/database';

const TYPES: CircleType[] = ['family', 'friends', 'couple', 'roommates', 'other'];

export function EditCircleForm({
  circleId,
  initialName,
  initialType,
}: {
  circleId: string;
  initialName: string;
  initialType: CircleType;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<CircleType>(initialType);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const dirty = name.trim() !== initialName || type !== initialType;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Le nom ne peut pas être vide.');
      return;
    }
    startTransition(async () => {
      try {
        await updateCircle(circleId, name.trim(), type);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur.');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs text-slate-500">Nom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CircleType)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending || !dirty}
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        Enregistrer
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </form>
  );
}

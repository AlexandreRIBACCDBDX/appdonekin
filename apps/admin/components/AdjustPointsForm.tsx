'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustPoints } from '@/lib/actions';

export function AdjustPointsForm({
  circleId,
  members,
}: {
  circleId: string;
  members: { id: string; first_name: string }[];
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseInt(amount, 10);
    if (!memberId || Number.isNaN(parsed) || parsed === 0 || !reason.trim()) {
      setError('Membre, montant (non nul) et motif sont requis.');
      return;
    }
    if (!window.confirm(`Confirmer l'ajustement de ${parsed} points ?`)) return;

    startTransition(async () => {
      try {
        await adjustPoints(memberId, parsed, reason.trim(), circleId);
        setAmount('');
        setReason('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur.');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Membre</label>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.first_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Montant (+/-)</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="20"
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs text-slate-500">Motif</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Correction suite à un incident technique"
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        Ajuster
      </button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </form>
  );
}

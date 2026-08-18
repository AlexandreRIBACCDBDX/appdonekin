'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Chain {
  task: { id: string; title: string; points: number; status: string };
  assigned_to: string | null;
  completions: {
    id: string;
    status: string;
    performed_by: string | null;
    recorded_by: string | null;
    validated_by: string | null;
    points_awarded: number | null;
    submitted_at: string;
    validated_at: string | null;
  }[];
  point_transactions: { id: string; member_id: string; amount: number; type: string; created_at: string }[];
}

// Answers "why didn't the 3 points get credited?" by tracing a task through
// assignment → performed_by/recorded_by/validated_by → the ledger rows it
// produced, without anyone touching Supabase directly.
export function TaskChainLookup() {
  const [taskId, setTaskId] = useState('');
  const [chain, setChain] = useState<Chain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLookup = async () => {
    setError(null);
    setChain(null);
    if (!taskId.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('admin_get_task_completion_chain', {
      p_task_id: taskId.trim(),
    });
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setChain(data as unknown as Chain);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">Diagnostiquer une tâche</p>
      <div className="flex gap-2">
        <input
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="ID de la tâche (UUID)"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        <button
          onClick={onLookup}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? '...' : 'Rechercher'}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {chain ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-medium text-slate-800">
            {chain.task.title} — {chain.task.points} pts — {chain.task.status}
          </p>
          <p className="text-slate-500">Assignée à : {chain.assigned_to ?? '—'}</p>
          {chain.completions.map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 p-2">
              <p>Statut : {c.status}</p>
              <p>Réalisée par : {c.performed_by ?? '—'}</p>
              <p>Enregistrée par : {c.recorded_by ?? '—'}</p>
              <p>Validée par : {c.validated_by ?? '—'}</p>
              <p>Points attribués : {c.points_awarded ?? '—'}</p>
            </div>
          ))}
          {chain.point_transactions.length > 0 ? (
            <div>
              <p className="font-medium text-slate-700">Transactions liées</p>
              {chain.point_transactions.map((t) => (
                <p key={t.id} className="text-slate-500">
                  {t.type} : {t.amount} pts — {new Date(t.created_at).toLocaleString()}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">Aucune transaction de points liée à cette tâche.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface ConfirmActionButtonProps {
  label: string;
  confirmMessage: string;
  tone?: 'danger' | 'primary' | 'neutral';
  requireReason?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
}

const TONE_CLASSES = {
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  neutral: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
} as const;

// A confirm() + optional reason prompt in front of any sensitive admin
// action — deliberately simple (no custom modal) but non-negotiable: every
// destructive/mutating button in the back office goes through this.
export function ConfirmActionButton({
  label,
  confirmMessage,
  tone = 'neutral',
  requireReason = false,
  onConfirm,
}: ConfirmActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = () => {
    let reason = '';
    if (requireReason) {
      const input = window.prompt(`${confirmMessage}\n\nMotif (obligatoire) :`);
      if (input === null || input.trim().length === 0) return;
      reason = input.trim();
    } else if (!window.confirm(confirmMessage)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await onConfirm(reason);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${TONE_CLASSES[tone]}`}
      >
        {isPending ? '...' : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

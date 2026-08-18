'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setFeatureFlag } from '@/lib/actions';

export function FeatureFlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onToggle = () => {
    startTransition(async () => {
      await setFeatureFlag(flagKey, !enabled);
      router.refresh();
    });
  };

  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-indigo-600' : 'bg-slate-300'} disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-5' : 'left-0.5'}`}
      />
    </button>
  );
}

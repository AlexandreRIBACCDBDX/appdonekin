'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setConfig } from '@/lib/actions';

const KNOWN_KEYS = [
  { key: 'max_members_per_circle', label: 'Membres max par cercle', placeholder: '20' },
  { key: 'max_free_circles_per_user', label: 'Cercles gratuits max par utilisateur', placeholder: '3' },
  { key: 'invitation_expiration_days', label: "Expiration des invitations (jours)", placeholder: '7' },
  { key: 'maintenance_mode', label: 'Mode maintenance (true/false)', placeholder: 'false' },
];

export function ConfigEditor({ config }: { config: Record<string, unknown> }) {
  const router = useRouter();

  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {KNOWN_KEYS.map((item) => (
        <ConfigRow key={item.key} configKey={item.key} label={item.label} placeholder={item.placeholder} currentValue={config[item.key]} />
      ))}
    </div>
  );

  function ConfigRow({
    configKey,
    label,
    placeholder,
    currentValue,
  }: {
    configKey: string;
    label: string;
    placeholder: string;
    currentValue: unknown;
  }) {
    const [value, setValue] = useState(currentValue !== undefined ? JSON.stringify(currentValue) : '');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const onSave = () => {
      setError(null);
      let parsed: unknown = value;
      try {
        parsed = JSON.parse(value);
      } catch {
        // keep as raw string if not valid JSON (e.g. plain number without quotes still parses fine)
      }
      startTransition(async () => {
        try {
          await setConfig(configKey, parsed);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur.');
        }
      });
    };

    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
        <div>
          <p className="font-medium text-slate-800">{label}</p>
          <code className="text-xs text-slate-400">{configKey}</code>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
          <button
            onClick={onSave}
            disabled={isPending}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Sauver
          </button>
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
      </div>
    );
  }
}

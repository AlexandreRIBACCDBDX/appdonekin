import { getConfig, listFeatureFlags } from '@/lib/data';
import { FeatureFlagToggle } from '@/components/FeatureFlagToggle';
import { ConfigEditor } from '@/components/ConfigEditor';

export default async function ConfigurationPage() {
  const [{ items: flags }, config] = await Promise.all([listFeatureFlags(), getConfig()]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configuration</h1>
        <p className="text-sm text-slate-500">
          Ces réglages sont validés côté backend (RLS + RPC) — ils ne sont jamais de simples toggles frontend.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Feature flags</h2>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{flag.key}</p>
                {flag.description ? <p className="text-xs text-slate-500">{flag.description}</p> : null}
              </div>
              <FeatureFlagToggle flagKey={flag.key} enabled={flag.enabled} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Paramètres globaux</h2>
        <ConfigEditor config={config} />
      </div>
    </div>
  );
}

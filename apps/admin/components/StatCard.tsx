import { Sparkline } from '@/components/Sparkline';

export function StatCard({
  label,
  value,
  hint,
  sparklineData,
  sparklineColor,
}: {
  label: string;
  value: string | number;
  hint?: string;
  sparklineData?: { day: string; value: number }[];
  sparklineColor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {sparklineData ? <Sparkline data={sparklineData} color={sparklineColor} /> : null}
    </div>
  );
}

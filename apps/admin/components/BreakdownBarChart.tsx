'use client';

import { useState } from 'react';

interface BreakdownItem {
  label: string;
  value: number;
}

export function BreakdownBarChart({ data, color = '#6366f1' }: { data: BreakdownItem[]; color?: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">Aucune donnée.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((d) => {
        const isHovered = hovered === d.label;
        const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
        return (
          <div
            key={d.label}
            className="flex items-center gap-3 text-xs"
            onMouseEnter={() => setHovered(d.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className={`w-24 shrink-0 truncate ${isHovered ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
              {d.label}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  backgroundColor: color,
                  opacity: isHovered ? 1 : 0.85,
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-medium text-slate-700">
              {d.value}
              {isHovered ? <span className="ml-1 font-normal text-slate-400">({pct}%)</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

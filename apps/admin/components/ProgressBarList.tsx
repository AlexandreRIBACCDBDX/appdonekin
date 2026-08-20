'use client';

import { useState } from 'react';

interface ProgressItem {
  label: string;
  value: number;
  target: number | null;
}

export function ProgressBarList({ items, color = '#6366f1' }: { items: ProgressItem[]; color?: string }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">Aucune donnée.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = item.target ? Math.min(100, Math.round((item.value / item.target) * 100)) : 0;
        const isHovered = hovered === item.label;
        return (
          <div key={item.label} onMouseEnter={() => setHovered(item.label)} onMouseLeave={() => setHovered(null)}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className={isHovered ? 'font-medium text-slate-700' : 'text-slate-500'}>{item.label}</span>
              <span className="font-semibold text-slate-800">
                {item.value}
                {item.target ? ` / ${item.target} pts (${pct}%)` : ' pts'}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${item.target ? pct : 0}%`, backgroundColor: color, opacity: isHovered ? 1 : 0.85 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

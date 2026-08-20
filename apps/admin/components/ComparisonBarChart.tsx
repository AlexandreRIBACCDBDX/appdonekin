'use client';

import { useState } from 'react';

interface ComparisonItem {
  label: string;
  value: number;
  color: string;
}

export function ComparisonBarChart({ items }: { items: ComparisonItem[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isHovered = hovered === item.label;
        return (
          <div
            key={item.label}
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className={isHovered ? 'font-medium text-slate-700' : 'text-slate-500'}>{item.label}</span>
              <span className="font-semibold text-slate-800">{item.value}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color, opacity: isHovered ? 1 : 0.85 }}
              />
            </div>
          </div>
        );
      })}
      {items.length === 2 && items[0].value > 0 ? (
        <p className="pt-1 text-xs text-slate-400">
          Taux de complétion : {Math.round((items[1].value / items[0].value) * 100)}%
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';

interface SparklinePoint {
  day: string;
  value: number;
}

function formatDay(day: string) {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function Sparkline({ data, color = '#6366f1' }: { data: SparklinePoint[]; color?: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 160;
  const height = 36;

  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - (d.value / max) * (height - 4) - 2,
    day: d.day,
    value: d.value,
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const lastX = points[points.length - 1]?.x ?? 0;
  const area = `${path} L ${lastX.toFixed(1)} ${height} L 0 ${height} Z`;

  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(x / (stepX || 1));
    setHoverIndex(Math.min(Math.max(idx, 0), data.length - 1));
  };

  return (
    <div className="relative mt-2" style={{ width }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHoverIndex(null)}>
        <path d={area} fill={color} opacity={0.12} />
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
        {hovered ? (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={0}
              y2={height}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.5}
            />
            <circle cx={hovered.x} cy={hovered.y} r={3} fill={color} />
          </>
        ) : null}
      </svg>
      {hovered ? (
        <div
          className="pointer-events-none absolute -top-6 z-10 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
          style={{ left: Math.min(Math.max(hovered.x - 24, 0), width - 56) }}
        >
          {formatDay(hovered.day)} · {hovered.value}
        </div>
      ) : null}
    </div>
  );
}

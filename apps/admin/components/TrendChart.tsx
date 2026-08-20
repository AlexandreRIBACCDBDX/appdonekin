'use client';

import { useState } from 'react';

interface Series {
  key: string;
  label: string;
  color: string;
}

interface TrendChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  height?: number;
}

function formatLabel(value: string | number | undefined) {
  if (value == null) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// A small dependency-free line/area chart — no charting library pulled in
// for what's fundamentally a handful of points per series over a period.
// Interactive: a transparent overlay tracks the mouse and shows every
// series' value for the nearest day, with a guide line and dots.
export function TrendChart({ data, xKey, series, height = 180 }: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 600;
  const paddingLeft = 28;
  const paddingRight = 8;
  const paddingTop = 12;
  const paddingBottom = 20;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const pointsFor = (key: string) =>
    data.map((d, i) => ({
      x: paddingLeft + i * stepX,
      y: paddingTop + innerHeight - (Number(d[key]) / maxValue) * innerHeight,
    }));

  const pathFor = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const areaFor = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    const base = paddingTop + innerHeight;
    return `${pathFor(points)} L ${points[points.length - 1].x.toFixed(1)} ${base} L ${points[0].x.toFixed(1)} ${base} Z`;
  };

  const firstLabel = formatLabel(data[0]?.[xKey]);
  const midLabel = formatLabel(data[Math.floor(data.length / 2)]?.[xKey]);
  const lastLabel = formatLabel(data[data.length - 1]?.[xKey]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width - paddingLeft;
    const idx = Math.round(relX / (stepX || 1));
    setHoverIndex(Math.min(Math.max(idx, 0), data.length - 1));
  };

  const hoverX = hoverIndex != null ? paddingLeft + hoverIndex * stepX : null;
  const hoverRow = hoverIndex != null ? data[hoverIndex] : null;
  const tooltipLeftPct = hoverX != null ? Math.min(Math.max((hoverX / width) * 100, 8), 78) : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: height }}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[0, 0.5, 1].map((g) => {
          const y = paddingTop + innerHeight * (1 - g);
          return <line key={g} x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
        })}
        <text x={paddingLeft - 4} y={paddingTop + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
          {maxValue}
        </text>
        <text x={paddingLeft - 4} y={paddingTop + innerHeight} textAnchor="end" fontSize={9} fill="#94a3b8">
          0
        </text>

        {series.map((s) => {
          const points = pointsFor(s.key);
          return (
            <g key={s.key}>
              <path d={areaFor(points)} fill={s.color} opacity={0.08} />
              <path d={pathFor(points)} fill="none" stroke={s.color} strokeWidth={2} />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === hoverIndex ? 4 : 2.5}
                  fill={s.color}
                  opacity={hoverIndex == null || i === hoverIndex ? 1 : 0.5}
                />
              ))}
            </g>
          );
        })}

        {hoverX != null ? (
          <line x1={hoverX} x2={hoverX} y1={paddingTop} y2={paddingTop + innerHeight} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3" />
        ) : null}

        <text x={paddingLeft} y={height - 4} fontSize={9} fill="#94a3b8">
          {firstLabel}
        </text>
        <text x={paddingLeft + innerWidth / 2} y={height - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
          {midLabel}
        </text>
        <text x={width - paddingRight} y={height - 4} textAnchor="end" fontSize={9} fill="#94a3b8">
          {lastLabel}
        </text>
      </svg>

      {hoverRow ? (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-[120px] rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] text-white shadow-lg"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <p className="mb-1 font-semibold text-slate-200">{formatLabel(hoverRow[xKey])}</p>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-medium">{hoverRow[s.key]}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export const chartTheme = {
  grid: 'rgba(148, 163, 184, 0.18)',
  tick: '#94a3b8',
  axis: '#64748b',
  tooltip: {
    backgroundColor: '#0a0e1a',
    border: '1px solid rgba(14, 165, 233, 0.45)',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  },
  polarBlue: '#38bdf8',
  aurora: '#34d399',
  alert: '#f87171',
  amber: '#fbbf24',
  violet: '#a78bfa',
};

export function ChartTooltipBox({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-polar-blue/40 bg-polar-dark/95 px-3 py-2 shadow-glow backdrop-blur-md">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="font-mono text-xs text-ice-white">
          <span className="text-slate-400">{p.name}: </span>
          <span style={{ color: p.color }}>{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

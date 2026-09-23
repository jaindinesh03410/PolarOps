import { Database, Brain, Edit3, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function DataProvenanceBadge({
  dataSource,
  confidence,
  explanation,
  showTooltip = true,
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  const getSourceConfig = () => {
    switch (dataSource) {
      case 'MEASURED':
        return { icon: Database, label: 'MEASURED', className: 'badge-measured', description: 'Direct sensor/field measurement' };
      case 'SIMULATED':
        return { icon: Brain, label: 'SIMULATED', className: 'badge-simulated', description: 'ML model prediction' };
      case 'MANUAL_ENTRY':
        return { icon: Edit3, label: 'MANUAL', className: 'badge-manual', description: 'Human-entered data' };
      default:
        return { icon: HelpCircle, label: 'UNKNOWN', className: 'badge-manual', description: 'Unknown data source' };
    }
  };

  const config = getSourceConfig();
  const Icon = config.icon;
  const conf = Number(confidence);
  const confColor =
    conf >= 90 ? 'text-emerald-400' : conf >= 75 ? 'text-amber-300' : conf >= 60 ? 'text-orange-400' : 'text-rose-400';

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        type="button"
        className={`${config.className} inline-flex items-center gap-1`}
        onClick={() => showTooltip && setShowExplanation((v) => !v)}
      >
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </button>

      {Number.isFinite(conf) && (
        <span className={`font-mono text-xs font-semibold ${confColor}`}>{conf}%</span>
      )}

      {showExplanation && explanation && (
        <div className="absolute left-0 top-full z-30 mt-2 max-w-sm rounded-xl border border-white/10 bg-polar-dark/95 p-3 text-ice-white shadow-elevation-4 backdrop-blur-md">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-polar-blue-light">
            {config.description}
          </div>
          <div className="text-xs leading-relaxed text-slate-200">{explanation}</div>
        </div>
      )}
    </div>
  );
}

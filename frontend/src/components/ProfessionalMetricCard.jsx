import { motion } from 'framer-motion';

const TONES = {
  success: 'border-emerald-500/30 bg-emerald-50/50',
  warning: 'border-amber-500/30 bg-amber-50/50',
  critical: 'border-rose-500/30 bg-rose-50/50',
  info: 'border-sky-500/30 bg-sky-50/50',
  neutral: 'border-slate-200 bg-white',
};

const ICON_COLORS = {
  success: 'text-emerald-600 bg-emerald-100',
  warning: 'text-amber-600 bg-amber-100',
  critical: 'text-rose-600 bg-rose-100',
  info: 'text-sky-600 bg-sky-100',
  neutral: 'text-slate-600 bg-slate-100',
};

export default function ProfessionalMetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon: Icon,
  className = ''
}) {
  const toneClass = TONES[tone];
  const iconColor = ICON_COLORS[tone];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={`rounded-lg border-2 p-5 shadow-sm transition-all ${toneClass} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 font-semibold">
          {label}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-4 h-4" strokeWidth={2.5} />
          </div>
        )}
      </div>
      
      <div className="font-mono text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
        {value}
      </div>
      
      {hint && (
        <div className="text-xs text-slate-600 font-medium">
          {hint}
        </div>
      )}
    </motion.div>
  );
}

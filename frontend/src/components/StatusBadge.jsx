// Centralized status resolution and display
// Pattern from modern enterprise UI systems

const STATUS_MAP = {
  // Inventory
  'CRITICAL': 'critical',
  'LOW': 'warning',
  'ADEQUATE': 'success',
  'OPTIMAL': 'success',
  
  // General
  'ACTIVE': 'success',
  'INACTIVE': 'neutral',
  'PENDING': 'warning',
  'FAILED': 'critical',
  'COMPLETED': 'success',
  
  // Alerts
  'HIGH': 'critical',
  'MEDIUM': 'warning', 
  'LOW': 'info',
  
  // Stations
  'ISOLATED': 'warning',
  'EVACUATED': 'critical',
  'NOMINAL': 'success',
};

export function resolveStatus(rawStatus) {
  if (!rawStatus) return 'neutral';
  const normalized = String(rawStatus).toUpperCase();
  return STATUS_MAP[normalized] || 'neutral';
}

const VARIANTS = {
  // Subtle (default) - tinted background
  subtle: {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  // Solid - full color
  solid: {
    success: 'bg-emerald-600 text-white border-emerald-600',
    warning: 'bg-amber-600 text-white border-amber-600',
    critical: 'bg-rose-600 text-white border-rose-600',
    info: 'bg-sky-600 text-white border-sky-600',
    neutral: 'bg-slate-600 text-white border-slate-600',
  }
};

export default function StatusBadge({ 
  status, 
  variant = 'subtle', 
  children,
  className = '' 
}) {
  const tone = typeof status === 'string' ? resolveStatus(status) : status;
  const styles = VARIANTS[variant][tone] || VARIANTS[variant].neutral;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider ${styles} ${className}`}>
      {children || tone}
    </span>
  );
}

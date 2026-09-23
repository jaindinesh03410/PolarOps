import { AlertCircle } from 'lucide-react';

const SIZE = {
  sm: 'px-2.5 py-1 text-[10px]',
  lg: 'px-3 py-1.5 text-xs',
};

export default function SeverityBadge({ severity, size = 'sm' }) {
  const key = (severity || 'INFO').toUpperCase();
  const colorClass = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
    INFO: 'badge-low',
  }[key] || 'badge-manual';

  return (
    <span className={`${colorClass} ${SIZE[size] || SIZE.sm} inline-flex items-center gap-1`}>
      {key === 'CRITICAL' && <AlertCircle className="h-3 w-3" />}
      {key}
    </span>
  );
}

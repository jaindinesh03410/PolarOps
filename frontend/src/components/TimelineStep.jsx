import { CheckCircle2, Circle, Clock } from 'lucide-react';

const ICONS = {
  complete: CheckCircle2,
  current: Clock,
  upcoming: Circle,
};

const COLORS = {
  complete: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  current: 'text-sky-600 bg-sky-50 border-sky-200 animate-pulse',
  upcoming: 'text-slate-400 bg-slate-50 border-slate-200',
};

const LINE_COLORS = {
  complete: 'bg-emerald-600',
  current: 'bg-sky-600',
  upcoming: 'bg-slate-300',
};

export default function TimelineStep({ 
  status, 
  title, 
  description, 
  date,
  isLast = false 
}) {
  const Icon = ICONS[status];
  const colorClass = COLORS[status];
  const lineColor = LINE_COLORS[status];

  return (
    <div className="relative flex gap-4">
      {/* Icon Column */}
      <div className="flex flex-col items-center">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${colorClass} z-10`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        {!isLast && (
          <div className={`w-0.5 h-full mt-1 ${lineColor}`} />
        )}
      </div>

      {/* Content Column */}
      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-8'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className={`font-semibold ${
              status === 'complete' ? 'text-slate-900' : 
              status === 'current' ? 'text-sky-900' : 
              'text-slate-500'
            }`}>
              {title}
            </h4>
            {description && (
              <p className="text-sm text-slate-600 mt-1">{description}</p>
            )}
          </div>
          {date && (
            <div className="text-xs font-mono text-slate-500 ml-4">
              {date}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Timeline({ children }) {
  return (
    <div className="space-y-0">
      {children}
    </div>
  );
}

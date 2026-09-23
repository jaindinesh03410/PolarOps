import { useState } from 'react';
import { Check, Edit, X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const COLORS = {
  warning: 'border-amber-500/30 bg-amber-50',
  info: 'border-sky-500/30 bg-sky-50',
  success: 'border-emerald-500/30 bg-emerald-50',
  critical: 'border-rose-500/30 bg-rose-50',
};

const ICON_COLORS = {
  warning: 'text-amber-600',
  info: 'text-sky-600',
  success: 'text-emerald-600',
  critical: 'text-rose-600',
};

export default function AlertApprovalCard({
  title,
  description,
  tone = 'info',
  status = 'pending_review', // 'pending_review' | 'approved' | 'edited' | 'dismissed'
  onApprove,
  onEdit,
  onDismiss,
  approvedBy,
  approvedAt,
  metadata,
}) {
  const [localStatus, setLocalStatus] = useState(status);
  const [isProcessing, setIsProcessing] = useState(false);

  const Icon = ICONS[tone] || Info;
  const colorClass = COLORS[tone];
  const iconColor = ICON_COLORS[tone];

  const handleAction = async (action, handler) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await handler?.();
      setLocalStatus(action);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (localStatus !== 'pending_review') {
    // Collapsed confirmation state
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className={`rounded-lg border-2 p-4 ${colorClass}`}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">
              {localStatus === 'approved' && 'Approved'}
              {localStatus === 'edited' && 'Edited'}
              {localStatus === 'dismissed' && 'Dismissed'}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {approvedBy && `by ${approvedBy}`} {approvedAt && `• ${approvedAt}`}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border-2 p-5 shadow-sm ${colorClass}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-white/50 ${iconColor}`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900 mb-1">{title}</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{description}</p>
          
          {metadata && (
            <div className="mt-3 p-3 bg-white/50 rounded-md">
              <div className="text-xs font-mono text-slate-600">
                {JSON.stringify(metadata, null, 2)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => handleAction('approved', onApprove)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            
            <button
              onClick={() => handleAction('edited', onEdit)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            
            <button
              onClick={() => handleAction('dismissed', onDismiss)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

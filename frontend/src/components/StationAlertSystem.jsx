import { useState } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck,
  X, ChevronDown, ChevronUp,
  Package, HeartPulse, Zap, Radio,
  AlertTriangle, Info, Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from './StatusBadge';
import { api } from '../lib/api';

// ── Category → icon map ────────────────────────────────────────────────────
const CATEGORY_ICON = {
  INVENTORY_LOW:      Package,
  WELLNESS_CONCERN:   HeartPulse,
  HAZARD_DETECTED:    ShieldAlert,
  SOS_TRIGGERED:      Radio,
  COMPLIANCE_VIOLATION: Activity,
  COMBINED_RISK:      Zap,
  WEATHER_INVENTORY:  Package,
  WEATHER_HAZARD:     ShieldAlert,
  GENERAL:            Info,
};

// ── Severity → dark-theme card classes ────────────────────────────────────
// Uses the existing polar-dark token family; avoids any light-mode pastels.
const SEVERITY_CARD = {
  CRITICAL: 'border-rose-700    bg-rose-950/30',
  HIGH:     'border-orange-700  bg-orange-950/25',
  WARNING:  'border-amber-700   bg-amber-950/25',
  MEDIUM:   'border-amber-700   bg-amber-950/25',
  LOW:      'border-sky-700     bg-sky-950/20',
  INFO:     'border-sky-800     bg-sky-950/15',
};

// ── Severity → shield icon + tint classes ─────────────────────────────────
function SeverityShield({ severity }) {
  const sev = (severity || 'INFO').toUpperCase();
  const config =
    sev === 'CRITICAL'             ? { Icon: ShieldAlert, bg: 'bg-rose-900/60',   ring: 'border-rose-700',   icon: 'text-rose-400'   } :
    sev === 'HIGH' || sev === 'WARNING' ? { Icon: ShieldAlert, bg: 'bg-orange-900/60', ring: 'border-orange-700', icon: 'text-orange-400' } :
    sev === 'MEDIUM'               ? { Icon: Shield,      bg: 'bg-amber-900/60',  ring: 'border-amber-700',  icon: 'text-amber-400'  } :
                                     { Icon: ShieldCheck,  bg: 'bg-sky-900/60',    ring: 'border-sky-700',    icon: 'text-sky-400'    };
  const { Icon, bg, ring, icon } = config;
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${bg} ${ring}`}>
      <Icon className={`h-5 w-5 ${icon}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function StationAlertSystem({ notifications = [], onDismiss }) {
  const [expanded, setExpanded]   = useState(false);
  const [dismissing, setDismissing] = useState(null);
  // Local optimistic set — ids dismissed this session
  const [dismissed, setDismissed]  = useState(new Set());

  const visible = notifications.filter(n => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  const unresolved = visible.filter(n => n.status === 'ACTIVE');
  const topSeverity =
    unresolved.some(n => (n.severity || '').toUpperCase() === 'CRITICAL') ? 'CRITICAL' :
    unresolved.some(n => ['HIGH', 'WARNING'].includes((n.severity || '').toUpperCase())) ? 'HIGH' :
    unresolved.some(n => (n.severity || '').toUpperCase() === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  // Border accent on the card itself follows top severity
  const cardBorder =
    topSeverity === 'CRITICAL' ? 'border-l-rose-500' :
    topSeverity === 'HIGH'     ? 'border-l-orange-500' :
    topSeverity === 'MEDIUM'   ? 'border-l-amber-500' :
                                 'border-l-sky-500';

  const handleDismiss = async (notifId) => {
    if (dismissing === notifId) return;
    setDismissing(notifId);

    // 1. Optimistic — remove from visible list instantly
    setDismissed(prev => new Set([...prev, notifId]));

    // 2. Persist to backend
    try {
      await api.acknowledgeAlert(notifId);
    } catch {
      // If backend call fails the item stays dismissed locally for this
      // session; next hard reload will show it again (acceptable trade-off)
    }

    // 3. Lift up to parent so its alerts state also drops this id
    onDismiss?.(notifId);

    setDismissing(null);
  };

  const preview = visible[0];

  return (
    <div className={`card-glass border-l-4 ${cardBorder}`}>
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 gap-3 min-w-0">
          <SeverityShield severity={topSeverity} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-bold text-white">
                Station Alerts
              </h3>
              <StatusBadge status={topSeverity} variant="solid">
                {unresolved.length} active
              </StatusBadge>
            </div>
            <p className="truncate text-sm text-slate-400">
              <span className="font-semibold text-slate-300">{preview.title}</span>
              {preview.details && preview.details !== 'No details available'
                ? ` — ${preview.details}`
                : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? 'Collapse' : `View all ${visible.length}`}
        </button>
      </div>

      {/* ── Expanded list ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="space-y-2.5 overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {visible.map((notif, index) => {
                const sev = (notif.severity || 'INFO').toUpperCase();
                const cardCls = SEVERITY_CARD[sev] || SEVERITY_CARD.INFO;
                const CatIcon = CATEGORY_ICON[notif.category] || CATEGORY_ICON.GENERAL;
                const isActive = notif.status === 'ACTIVE';

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    className={`rounded-xl border p-4 ${cardCls}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: content */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Title row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Station code chip */}
                          <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
                            {notif.stationCode}
                          </span>
                          {/* Category icon + label */}
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <CatIcon className="h-3 w-3" />
                            {(notif.category || 'GENERAL').replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-white">{notif.title}</span>
                        </div>

                        {/* Detail text */}
                        {notif.details && notif.details !== 'No details available' && (
                          <p className="text-sm leading-relaxed text-slate-300">
                            {notif.details}
                          </p>
                        )}

                        {/* Timestamp */}
                        <p className="font-mono text-[10px] text-slate-500">
                          {new Date(notif.triggeredAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* Right: action */}
                      {isActive ? (
                        <button
                          onClick={() => handleDismiss(notif.id)}
                          disabled={dismissing === notif.id}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Dismiss alert"
                        >
                          {dismissing === notif.id
                            ? <span className="font-mono">…</span>
                            : <><X className="h-3 w-3" /> Dismiss</>
                          }
                        </button>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-800 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Cleared
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

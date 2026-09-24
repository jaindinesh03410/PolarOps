/**
 * FieldCrewDashboard.jsx — Advanced polar field-crew UI
 * All logic (SOS, wellness, offline queue, API calls) is unchanged.
 * Only the presentation layer is redesigned.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useOffline } from '../contexts/OfflineContext';
import { api } from '../lib/api';
import {
  AlertTriangle, Heart, Send, CheckCircle, Loader2,
  WifiOff, Wifi, Package, ChevronUp, ChevronDown,
  Clock, Minus, Plus, ShieldAlert, Activity,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { EnvironmentalMonitor } from '../components/EnvironmentalMonitor';

// ── Tiny sparkline (SVG, no recharts dependency) ─────────────────────────────
function Sparkline({ data, width = 200, height = 48 }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.mood_score);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals) || 1;
  const pts  = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* last dot */}
      {(() => {
        const [lx, ly] = pts.split(' ').pop().split(',');
        return <circle cx={lx} cy={ly} r="3" fill="#38bdf8" />;
      })()}
    </svg>
  );
}

// ── SVG readiness ring ────────────────────────────────────────────────────────
function ReadinessRing({ score }) {
  const r   = 36;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  const color = score >= 70 ? '#7FE0B8' : score >= 45 ? '#F5A623' : '#F2545B';
  return (
    <svg width="96" height="96" className="drop-shadow-lg">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="48" y="52" textAnchor="middle"
        style={{ fontSize: 20, fontWeight: 800, fill: color, fontFamily: 'IBM Plex Mono, monospace' }}>
        {score}
      </text>
    </svg>
  );
}

// ── Press-and-hold SOS button with progress ring ──────────────────────────────
function SOSHoldButton({ onActivate, sending, disabled }) {
  const HOLD_MS = 2000;
  const pressRef = useRef(null);
  const [progress, setProgress] = useState(0); // 0-1
  const rafRef = useRef(null);
  const shouldReduce = useReducedMotion();

  const startHold = useCallback(() => {
    if (disabled || sending) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / HOLD_MS, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(0);
        onActivate();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, sending, onActivate]);

  const cancelHold = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const r = 28;
  const circ = 2 * Math.PI * r;
  const isHolding = progress > 0;

  return (
    <motion.button
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      disabled={disabled || sending}
      whileTap={shouldReduce ? {} : { scale: 0.96 }}
      className={`
        relative flex min-h-[72px] w-full select-none items-center
        justify-center gap-3 rounded-2xl text-xl font-black tracking-wide
        transition-all duration-200
        ${disabled
          ? 'cursor-not-allowed bg-white/5 text-white/30 border border-white/10'
          : isHolding
            ? 'bg-rose-700 text-white border-2 border-rose-400'
            : 'bg-rose-600 text-white border-2 border-rose-400/60 shadow-[0_0_24px_rgba(239,68,68,0.35)] hover:bg-rose-500'}
      `}
      aria-label="Hold to send SOS"
    >
      {/* Progress ring overlay */}
      {isHolding && !shouldReduce && (
        <svg
          className="pointer-events-none absolute inset-0 m-auto"
          width="68" height="68"
          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
        >
          <circle
            cx="34" cy="34" r={r}
            fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4"
          />
          <circle
            cx="34" cy="34" r={r}
            fill="none" stroke="white" strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${circ * progress} ${circ * (1 - progress)}`}
            strokeDashoffset={circ * 0.25}
          />
        </svg>
      )}

      {sending ? (
        <><Loader2 className="h-7 w-7 animate-spin" /> SENDING…</>
      ) : (
        <>
          <ShieldAlert className="h-7 w-7" />
          {disabled
            ? 'Describe emergency above'
            : isHolding
              ? `HOLD… ${Math.round(progress * 100)}%`
              : 'HOLD TO SEND SOS'}
        </>
      )}
    </motion.button>
  );
}

// ── Pill scale (1-10 tappable) ────────────────────────────────────────────────
const MOOD_EMOJI    = ['','😫','😟','😕','😐','🙂','😊','😄','🤩','⚡','💪'];
const FATIGUE_COLOR = v => v <= 3 ? 'bg-emerald-500' : v <= 6 ? 'bg-amber-500' : 'bg-rose-500';
const STRESS_COLOR  = v => v <= 3 ? 'bg-emerald-500' : v <= 6 ? 'bg-amber-500' : 'bg-rose-500';
const MOOD_COLOR    = v => v >= 7 ? 'bg-polar-blue'  : v >= 5 ? 'bg-amber-500' : 'bg-rose-500';

function PillScale({ value, onChange, colorFn, showEmoji = false }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <motion.button
          key={n}
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => onChange(n)}
          className={`
            min-h-[44px] min-w-[44px] rounded-xl text-sm font-bold
            border transition-all duration-150 flex-1
            ${value === n
              ? `${colorFn(n)} text-white border-transparent shadow-lg`
              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'}
          `}
        >
          {showEmoji && value === n ? MOOD_EMOJI[n] : n}
        </motion.button>
      ))}
    </div>
  );
}

// ── Sleep stepper ─────────────────────────────────────────────────────────────
function SleepStepper({ value, onChange }) {
  return (
    <div className="flex items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => onChange(Math.max(0, value - 0.5))}
        className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl font-bold text-white hover:bg-white/10"
      >
        <Minus className="h-5 w-5" />
      </motion.button>
      <div className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-center">
        <span className="font-mono text-3xl font-black text-polar-blue-light">{value}</span>
        <span className="ml-1 text-sm text-slate-400">hrs</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={() => onChange(Math.min(24, value + 0.5))}
        className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl font-bold text-white hover:bg-white/10"
      >
        <Plus className="h-5 w-5" />
      </motion.button>
    </div>
  );
}

// ── Readiness score calculator ────────────────────────────────────────────────
function calcReadiness({ mood_score, fatigue_level, stress_level, sleep_hours }) {
  const moodPts    = (mood_score    / 10) * 35;
  const fatiguePts = ((10 - fatigue_level) / 10) * 30;
  const stressPts  = ((10 - stress_level)  / 10) * 20;
  const sleepPts   = Math.min(sleep_hours / 8, 1) * 15;
  return Math.round(moodPts + fatiguePts + stressPts + sleepPts);
}

// ── Glass card ────────────────────────────────────────────────────────────────
function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, children, color = 'text-polar-blue-light' }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {Icon && <Icon className={`h-5 w-5 ${color}`} />}
      <h2 className={`font-display text-xl font-bold ${color}`}>{children}</h2>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FieldCrewDashboard() {
  const { personnel }                                    = useAuth();
  const toast                                            = useToast();
  const { isOnline, queueAction, queuedActions }         = useOffline();
  const [sosMessage,  setSOSMessage]                     = useState('');
  const [sending,     setSending]                        = useState(false);
  const [wellness,    setWellness]                       = useState({
    mood_score: 7, fatigue_level: 3, stress_level: 3, sleep_hours: 7,
  });
  const [myWellness,  setMyWellness]                     = useState([]);
  const [inventory,   setInventory]                      = useState([]);
  const [activeTab,   setActiveTab]                      = useState('sos'); // sos | wellness | supplies
  const [localTime,   setLocalTime]                      = useState('');
  const shouldReduce = useReducedMotion();

  // Live clock
  useEffect(() => {
    const tick = () => setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (personnel) loadData();
  }, [personnel]); // eslint-disable-line

  const loadData = async () => {
    if (!isOnline || !personnel) return;
    try {
      let wellnessData = [];
      try { wellnessData = await api.getPersonnelWellness(personnel.id); } catch {}
      let inventoryData = [];
      try { inventoryData = await api.getStationInventory(personnel.station_id); } catch {}
      setMyWellness(wellnessData || []);
      setInventory(inventoryData || []);
    } catch {}
  };

  // ── SOS (unchanged logic) ──────────────────────────────────────────────────
  const triggerSOS = async () => {
    if (!sosMessage.trim()) { toast.error('Please enter SOS message'); return; }
    if (!personnel) { toast.error('Personnel data not available. Please refresh and try again.'); return; }
    setSending(true);
    const sosData = {
      message: sosMessage, latitude: null, longitude: null, severity: 'MEDIUM',
      personnel_id: personnel.id, station_id: personnel.station_id,
    };
    if (isOnline) {
      try {
        await api.createSOS(sosData);
        toast.success('SOS sent successfully! Emergency teams notified.');
        setSOSMessage('');
      } catch (error) {
        toast.error(`Failed to send SOS: ${error.message}`);
      } finally { setSending(false); }
    } else {
      try {
        await queueAction({ type: 'api', url: `${import.meta.env.VITE_API_URL}/sos`, method: 'POST', data: sosData });
        toast.info('SOS queued - will send when online!');
        setSOSMessage('');
      } catch { toast.error('Failed to queue SOS'); }
      finally { setSending(false); }
    }
  };

  // ── Wellness submit (unchanged logic) ─────────────────────────────────────
  const submitWellness = async () => {
    if (!personnel?.id) { toast.error('Personnel data not available. Please refresh and login again.'); return; }
    const wellnessData = {
      personnel_id: personnel.id, ...wellness,
      checkin_date: new Date().toISOString().split('T')[0],
    };
    if (isOnline) {
      try {
        await api.submitWellness(wellnessData);
        toast.success('Wellness check-in submitted!');
        await loadData();
      } catch (error) { toast.error(`Failed: ${error.message}`); }
    } else {
      try {
        await queueAction({ type: 'api', url: `${import.meta.env.VITE_API_URL}/wellness`, method: 'POST', data: wellnessData });
        toast.info('Wellness check-in queued!');
      } catch { toast.error('Failed to queue wellness data'); }
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const readiness     = calcReadiness(wellness);
  const sortedInv     = [...inventory].sort((a, b) => {
    const aLow = a.current_quantity <= a.minimum_threshold;
    const bLow = b.current_quantity <= b.minimum_threshold;
    return aLow === bLow ? 0 : aLow ? -1 : 1;
  });
  const sparkData     = [...myWellness]
    .sort((a, b) => new Date(a.checkin_date) - new Date(b.checkin_date))
    .slice(-7);

  // ── Stagger animation ──────────────────────────────────────────────────────
  const container = {
    hidden: {},
    show:   { transition: { staggerChildren: shouldReduce ? 0 : 0.07 } },
  };
  const item = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="flex min-h-screen flex-col pb-28">

      {/* ── Header status strip ── */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/8 bg-polar-dark/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
          <span className="font-mono text-xs text-slate-400">
            {isOnline ? 'Link up' : `Offline · ${queuedActions.length} queued`}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />{localTime}
          </span>
          <span className="text-slate-600">{personnel?.full_name}</span>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="px-4 pt-5 pb-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-polar-blue-light">
          Field Crew · {personnel?.stations?.name || personnel?.station_id || 'Station'}
        </p>
        <h1 className="mt-0.5 font-display text-3xl font-bold tracking-tight text-white">
          Mission Status
        </h1>
      </div>

      {/* ── Main scrollable content ── */}
      <motion.div
        className="flex-1 space-y-4 px-4 pt-2"
        variants={container}
        initial="hidden"
        animate="show"
      >

        {/* ── SOS CARD ── */}
        <motion.div variants={item}>
          <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/40 bg-polar-dark shadow-[0_0_32px_rgba(239,68,68,0.18)]">
            {/* Subtle radar sweep bg */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                background: 'repeating-linear-gradient(-45deg,#ef4444 0,#ef4444 1px,transparent 0,transparent 50%)',
                backgroundSize: '12px 12px',
              }}
            />
            {/* Pulsing border glow */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              animate={shouldReduce ? {} : {
                boxShadow: ['inset 0 0 0 1.5px rgba(239,68,68,0.2)', 'inset 0 0 0 1.5px rgba(239,68,68,0.55)', 'inset 0 0 0 1.5px rgba(239,68,68,0.2)'],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative p-5">
              {/* Header */}
              <div className="mb-4 flex items-center gap-3">
                <motion.div
                  animate={shouldReduce ? {} : { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-950/60"
                >
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                </motion.div>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-black text-white">Emergency SOS</h2>
                  <div className={`flex items-center gap-1.5 font-mono text-[11px] ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isOnline
                      ? <><Wifi className="h-3 w-3" />Online — sends immediately</>
                      : <><WifiOff className="h-3 w-3" />Offline — will sync on reconnect</>}
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative mb-4">
                <textarea
                  value={sosMessage}
                  onChange={e => setSOSMessage(e.target.value)}
                  placeholder="Describe the emergency — location, nature, number of persons…"
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-rose-500/30 bg-black/50 p-4 text-base text-ice-white placeholder-slate-500 focus:border-rose-400/60 focus:outline-none focus:ring-4 focus:ring-rose-500/20"
                />
                <span className="absolute bottom-3 right-3 font-mono text-[10px] text-slate-600">
                  {sosMessage.length}/500
                </span>
              </div>

              {/* Hold-to-send button */}
              <SOSHoldButton
                onActivate={triggerSOS}
                sending={sending}
                disabled={!sosMessage.trim()}
              />

              {/* Footer badge */}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2">
                <WifiOff className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <p className="font-mono text-[11px] text-slate-500">
                  Works with zero connectivity — message transmits when link returns.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── WELLNESS CHECK-IN ── */}
        <motion.div variants={item}>
          <GlassCard>
            <SectionLabel icon={Heart} color="text-rose-400">Daily Wellness</SectionLabel>

            {/* Readiness ring + score */}
            <div className="mb-5 flex items-center gap-5 rounded-xl border border-white/8 bg-black/20 p-4">
              <ReadinessRing score={readiness} />
              <div>
                <p className="font-display text-base font-bold text-white">Readiness Score</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {readiness >= 70 ? 'Field-ready' : readiness >= 45 ? 'Monitor closely' : 'Rest recommended'}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-600">Based on today's entries</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Mood */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold text-white">
                    Mood <span className="font-mono text-polar-blue-light">{wellness.mood_score}/10</span>
                    <span className="ml-2">{MOOD_EMOJI[wellness.mood_score]}</span>
                  </label>
                </div>
                <PillScale
                  value={wellness.mood_score}
                  onChange={v => setWellness(p => ({ ...p, mood_score: v }))}
                  colorFn={MOOD_COLOR}
                  showEmoji
                />
              </div>

              {/* Fatigue */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold text-white">
                    Fatigue <span className="font-mono text-amber-400">{wellness.fatigue_level}/10</span>
                  </label>
                  <span className="font-mono text-xs text-slate-500">
                    {wellness.fatigue_level <= 3 ? 'Fresh' : wellness.fatigue_level <= 6 ? 'Moderate' : 'Exhausted'}
                  </span>
                </div>
                <PillScale
                  value={wellness.fatigue_level}
                  onChange={v => setWellness(p => ({ ...p, fatigue_level: v }))}
                  colorFn={FATIGUE_COLOR}
                />
              </div>

              {/* Stress */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold text-white">
                    Stress <span className="font-mono text-rose-400">{wellness.stress_level}/10</span>
                  </label>
                  <span className="font-mono text-xs text-slate-500">
                    {wellness.stress_level <= 3 ? 'Calm' : wellness.stress_level <= 6 ? 'Elevated' : 'High'}
                  </span>
                </div>
                <PillScale
                  value={wellness.stress_level}
                  onChange={v => setWellness(p => ({ ...p, stress_level: v }))}
                  colorFn={STRESS_COLOR}
                />
              </div>

              {/* Sleep */}
              <div>
                <label className="mb-3 block font-semibold text-white">Sleep last night</label>
                <SleepStepper
                  value={wellness.sleep_hours}
                  onChange={v => setWellness(p => ({ ...p, sleep_hours: v }))}
                />
              </div>

              {/* Submit */}
              <motion.button
                whileTap={shouldReduce ? {} : { scale: 0.97 }}
                onClick={submitWellness}
                className="btn-primary flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl text-lg font-bold"
              >
                <CheckCircle className="h-6 w-6" />
                Submit check-in
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── RECENT CHECK-INS + SPARKLINE ── */}
        <motion.div variants={item}>
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel icon={Activity} color="text-polar-blue-light">
                7-day trend
              </SectionLabel>
              {sparkData.length > 0 && (
                <div className="opacity-80">
                  <Sparkline data={sparkData} width={120} height={40} />
                </div>
              )}
            </div>

            {myWellness.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Heart className="h-7 w-7 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No check-ins yet.<br />Submit your first one above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myWellness.slice(0, 5).map((w, i) => {
                  const atRisk = w.mood_score < 5 || w.fatigue_level > 7;
                  return (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-xl border px-4 py-3 ${atRisk ? 'border-rose-700/50 bg-rose-950/20' : 'border-white/8 bg-white/[0.03]'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(w.checkin_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                        {atRisk && (
                          <span className="rounded-full border border-rose-700/50 bg-rose-950/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-rose-400">
                            At risk
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs">
                        <span className="text-polar-blue-light">Mood <strong className="text-white">{w.mood_score}</strong></span>
                        <span className="text-amber-400">Fatigue <strong className="text-white">{w.fatigue_level}</strong></span>
                        <span className="text-rose-400">Stress <strong className="text-white">{w.stress_level}</strong></span>
                        <span className="text-slate-400">Sleep <strong className="text-white">{w.sleep_hours}h</strong></span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── ENVIRONMENTAL MONITORING ── */}
        <motion.div variants={item}>
          <EnvironmentalMonitor location="Field Operations" />
        </motion.div>

        {/* ── INVENTORY ── */}
        <motion.div variants={item}>
          <GlassCard>
            <SectionLabel icon={Package} color="text-amber-400">Station Supplies</SectionLabel>

            {sortedInv.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No inventory data available.</p>
            ) : (
              <div className="space-y-2">
                {sortedInv.slice(0, 6).map(item => {
                  const isLow = item.current_quantity <= item.minimum_threshold;
                  const pct   = Math.min(100, Math.round((item.current_quantity / (item.minimum_threshold * 3 || 1)) * 100));
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border px-4 py-3 ${isLow ? 'border-rose-700/50 bg-rose-950/15' : 'border-white/8 bg-white/[0.03]'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white">{item.item_name}</span>
                          {isLow && (
                            <span className="ml-2 rounded-full border border-rose-700/60 bg-rose-950/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-rose-400">
                              Low stock
                            </span>
                          )}
                          <p className="font-mono text-xs text-slate-500">{item.category}</p>
                        </div>
                        <span className={`font-mono text-lg font-black ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.current_quantity}
                          <span className="ml-1 text-xs font-normal text-slate-500">{item.unit}</span>
                        </span>
                      </div>
                      {/* Fill bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

      </motion.div>

      {/* ── Sticky bottom nav bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/10 bg-polar-dark/95 backdrop-blur-md">
        {[
          { id: 'sos',      label: 'SOS',      icon: ShieldAlert, color: 'text-rose-400'  },
          { id: 'wellness', label: 'Check-in',  icon: Heart,       color: 'text-rose-300'  },
          { id: 'supplies', label: 'Supplies',  icon: Package,     color: 'text-amber-400' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              // Scroll to section
              const map = { sos: 0, wellness: 1, supplies: 2 };
              const sections = document.querySelectorAll('[data-section]');
              sections[map[tab.id]]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`flex flex-1 flex-col items-center gap-1 py-3 transition-all ${activeTab === tab.id ? tab.color : 'text-slate-600 hover:text-slate-400'}`}
          >
            <tab.icon className="h-6 w-6" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}

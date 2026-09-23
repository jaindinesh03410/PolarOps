/**
 * EnvironmentalMonitor.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays live Antarctic environmental instrument readings with:
 *  • Standard / safe reference range per instrument
 *  • Colour-coded status band (NORMAL / CAUTION / DANGER) derived from value
 *  • Animated fill bar showing where current reading sits in the range
 *  • Clear, bold section headline with live pulse indicator
 */

import { useState, useEffect, useRef } from 'react';
import {
  CloudSnow, Wind, Gauge, Battery, Droplets,
  Thermometer, Sun, RotateCw, Satellite,
  CheckCircle2, AlertTriangle, XCircle, BellRing, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Instrument definitions ────────────────────────────────────────────────────
// Each has: standard range (min→max), safe operating band (safeMin→safeMax),
// caution band edges, and a note explaining the reference.
const INSTRUMENT_DEFS = [
  {
    id: 'i1', code: 'WX-TEMP-α',
    name: 'Exterior Temperature',
    icon: Thermometer,
    category: 'WEATHER',
    color: { from: '#0ea5e9', to: '#38bdf8' },   // sky
    unit: '°C',
    min: -60, max: 10,
    safeMin: -45, safeMax: -5,
    cautionMin: -55, cautionMax: 5,
    note: 'Standard Antarctic winter: −45°C to −5°C',
    baseValue: -22.3,
  },
  {
    id: 'i2', code: 'WX-WIND-β',
    name: 'Wind Velocity',
    icon: Wind,
    category: 'WEATHER',
    color: { from: '#8b5cf6', to: '#a78bfa' },   // violet
    unit: 'km/h',
    min: 0, max: 120,
    safeMin: 0, safeMax: 40,
    cautionMin: 0, cautionMax: 60,
    note: 'Ops limit: <40 km/h  ·  Blizzard: >60 km/h',
    baseValue: 18.7,
  },
  {
    id: 'i3', code: 'WX-BARO-γ',
    name: 'Barometric Pressure',
    icon: Gauge,
    category: 'WEATHER',
    color: { from: '#06b6d4', to: '#22d3ee' },   // cyan
    unit: 'mbar',
    min: 960, max: 1040,
    safeMin: 980, safeMax: 1025,
    cautionMin: 970, cautionMax: 1035,
    note: 'Normal sea-level: 980–1025 mbar',
    baseValue: 1009.4,
  },
  {
    id: 'i4', code: 'PWR-CHRG-δ',
    name: 'Battery Bank',
    icon: Battery,
    category: 'POWER',
    color: { from: '#f59e0b', to: '#fbbf24' },   // amber
    unit: '%',
    min: 0, max: 100,
    safeMin: 40, safeMax: 100,
    cautionMin: 20, cautionMax: 100,
    note: 'Critical below 20%  ·  Caution below 40%',
    baseValue: 94.2,
  },
  {
    id: 'i5', code: 'WX-HUMID-ε',
    name: 'Relative Humidity',
    icon: Droplets,
    category: 'WEATHER',
    color: { from: '#10b981', to: '#34d399' },   // emerald
    unit: '%RH',
    min: 0, max: 100,
    safeMin: 30, safeMax: 80,
    cautionMin: 20, cautionMax: 90,
    note: 'Equipment safe: 30–80 %RH',
    baseValue: 71,
  },
  {
    id: 'i6', code: 'WX-UV-ζ',
    name: 'UV Radiation Index',
    icon: Sun,
    category: 'WEATHER',
    color: { from: '#f97316', to: '#fb923c' },   // orange
    unit: 'UVI',
    min: 0, max: 16,
    safeMin: 0, safeMax: 5,
    cautionMin: 0, cautionMax: 8,
    note: 'Safe: 0–5  ·  Caution: 6–8  ·  Danger: >8',
    baseValue: 3.2,
  },
];

// ── Status derivation ─────────────────────────────────────────────────────────
function getStatus(def, value) {
  if (value >= def.safeMin && value <= def.safeMax)
    return { label: 'NORMAL',  icon: CheckCircle2, bg: 'bg-emerald-900/50', border: 'border-emerald-700', text: 'text-emerald-400', bar: '#10b981' };
  if (value >= def.cautionMin && value <= def.cautionMax)
    return { label: 'CAUTION', icon: AlertTriangle, bg: 'bg-amber-900/50',  border: 'border-amber-700',  text: 'text-amber-400',  bar: '#f59e0b' };
  return   { label: 'DANGER',  icon: XCircle,      bg: 'bg-rose-900/50',   border: 'border-rose-700',   text: 'text-rose-400',   bar: '#ef4444' };
}

// Percentage fill within the display range (0–100)
function fillPct(def, value) {
  return Math.max(0, Math.min(100, ((value - def.min) / (def.max - def.min)) * 100));
}

// ── Instrument Card ───────────────────────────────────────────────────────────
function InstrumentCard({ def, value, state, delay }) {
  const status  = getStatus(def, value);
  const fill    = fillPct(def, value);
  const Icon    = def.icon;
  const SIcon   = status.icon;
  const isActive = state === 'ACTIVE';

  // Safe-range markers as % of display range
  const safeLeft  = fillPct(def, def.safeMin);
  const safeRight = fillPct(def, def.safeMax);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border ${status.border} bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 backdrop-blur-sm transition-shadow hover:shadow-[0_0_24px_rgba(14,165,233,0.15)]`}
    >
      {/* Top row: icon + status badge */}
      <div className="mb-3 flex items-start justify-between">
        {/* Instrument icon */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
          style={{ background: `linear-gradient(135deg, ${def.color.from}, ${def.color.to})` }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Status chip */}
        <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${status.bg} ${status.text} border ${status.border}`}>
          <SIcon className="h-2.5 w-2.5" />
          {status.label}
        </span>
      </div>

      {/* Instrument name + code */}
      <p className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: def.color.to }}>
        {def.code}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white">{def.name}</p>

      {/* Big reading */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-black text-white">
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        </span>
        <span className="font-mono text-sm font-bold text-slate-400">{def.unit}</span>
      </div>

      {/* Standard range note */}
      <p className="mt-1 text-[10px] text-slate-500">{def.note}</p>

      {/* Fill bar with safe-range marker */}
      <div className="relative mt-3">
        {/* Track */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          {/* Safe zone highlight */}
          <div
            className="absolute top-0 h-2 rounded-full bg-emerald-500/20"
            style={{ left: `${safeLeft}%`, width: `${safeRight - safeLeft}%` }}
          />
          {/* Current value fill */}
          <motion.div
            className="h-2 rounded-full"
            style={{ background: `linear-gradient(90deg, ${def.color.from}, ${status.bar})` }}
            initial={{ width: 0 }}
            animate={{ width: `${fill}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        {/* Min / Max labels */}
        <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-600">
          <span>{def.min}{def.unit}</span>
          <span className="text-slate-500">safe: {def.safeMin}–{def.safeMax}</span>
          <span>{def.max}{def.unit}</span>
        </div>
      </div>

      {/* Inactive overlay */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
          <span className="rounded-lg bg-slate-700 px-3 py-1 font-mono text-xs font-bold uppercase text-slate-400">
            Standby
          </span>
        </div>
      )}

      {/* Danger pulse glow */}
      {status.label === 'DANGER' && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl animate-pulse-slow"
          style={{ boxShadow: 'inset 0 0 0 1.5px rgba(239,68,68,0.5)' }} />
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function EnvironmentalMonitor({ location = 'Research Base' }) {
  const [readings, setReadings] = useState({});
  const [states, setStates]     = useState({});
  const [syncing, setSyncing]   = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  // Auto-alerts: { id, instrumentId, message, timestamp }
  const [autoAlerts, setAutoAlerts]   = useState([]);
  // Track which instrument IDs were DANGER on last check — prevents
  // re-firing the same alert on every re-render while still in danger
  const prevDangerRef = useRef(new Set());

  // Seed readings once on mount
  useEffect(() => {
    const seed = {};
    const st   = {};
    INSTRUMENT_DEFS.forEach(d => { seed[d.id] = d.baseValue; st[d.id] = 'ACTIVE'; });
    setReadings(seed);
    setStates(st);
    setLastUpdate(new Date());
  }, []);

  // Auto-alert trigger — fires whenever readings change
  useEffect(() => {
    if (Object.keys(readings).length === 0) return;
    const newAlerts = [];
    const currentDanger = new Set();

    INSTRUMENT_DEFS.forEach(def => {
      const v = readings[def.id];
      if (v === undefined) return;
      const status = getStatus(def, v);
      if (status.label === 'DANGER') {
        currentDanger.add(def.id);
        // Only fire a new alert if this instrument just entered DANGER
        if (!prevDangerRef.current.has(def.id)) {
          newAlerts.push({
            id:           `${def.id}-${Date.now()}`,
            instrumentId: def.id,
            code:         def.code,
            name:         def.name,
            value:        v,
            unit:         def.unit,
            note:         def.note,
            timestamp:    new Date(),
          });
        }
      }
    });

    prevDangerRef.current = currentDanger;

    if (newAlerts.length > 0) {
      setAutoAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // cap at 10
    }
  }, [readings]);

  const dismissAlert = (alertId) => {
    setAutoAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const dismissAll = () => setAutoAlerts([]);

  const syncData = () => {
    setSyncing(true);
    setTimeout(() => {
      setReadings(prev => {
        const next = { ...prev };
        INSTRUMENT_DEFS.forEach(d => {
          // Small realistic drift per refresh
          const drift = (Math.random() - 0.5) * (d.max - d.min) * 0.03;
          next[d.id] = Math.max(d.min, Math.min(d.max, (prev[d.id] ?? d.baseValue) + drift));
        });
        return next;
      });
      setStates(prev => {
        const next = { ...prev };
        INSTRUMENT_DEFS.forEach(d => {
          next[d.id] = Math.random() > 0.1 ? 'ACTIVE' : 'STANDBY';
        });
        return next;
      });
      setLastUpdate(new Date());
      setSyncing(false);
    }, 1400);
  };

  const activeCount  = INSTRUMENT_DEFS.filter(d => states[d.id] === 'ACTIVE').length;
  const dangerCount  = INSTRUMENT_DEFS.filter(d => {
    const v = readings[d.id];
    return v !== undefined && getStatus(d, v).label === 'DANGER';
  }).length;
  const cautionCount = INSTRUMENT_DEFS.filter(d => {
    const v = readings[d.id];
    return v !== undefined && getStatus(d, v).label === 'CAUTION';
  }).length;

  return (
    <div className="card-glass space-y-5">

      {/* ── Headline ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Live pulse */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-700 bg-sky-950/60 shadow-lg">
            <CloudSnow className="h-6 w-6 text-sky-400" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div>
            <h3 className="font-display text-xl font-bold tracking-tight text-white">
              Environmental Instruments
            </h3>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-sky-400">
              {location} · Real-time sensor array
            </p>
          </div>
        </div>

        {/* Summary chips + sync */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-950/50 px-3 py-1.5 font-mono text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {activeCount} Online
          </span>
          {cautionCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-xl border border-amber-700 bg-amber-950/50 px-3 py-1.5 font-mono text-xs font-bold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {cautionCount} Caution
            </span>
          )}
          {dangerCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-xl border border-rose-700 bg-rose-950/50 px-3 py-1.5 font-mono text-xs font-bold text-rose-400 animate-pulse-slow">
              <XCircle className="h-3.5 w-3.5" />
              {dangerCount} Danger
            </span>
          )}
          <button
            onClick={syncData}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* ── Status legend ── */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-white/5 bg-black/20 px-4 py-2.5 font-mono text-[10px] text-slate-500">
        <span>Reading status bands:</span>
        <span className="flex items-center gap-1 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> NORMAL — within standard operating range</span>
        <span className="flex items-center gap-1 text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-500" /> CAUTION — approaching operational limits</span>
        <span className="flex items-center gap-1 text-rose-400"><span className="h-2 w-2 rounded-full bg-rose-500" /> DANGER — outside safe operating range</span>
        <span className="ml-auto flex items-center gap-1 text-slate-600">
          <span className="inline-block h-2 w-4 rounded-full bg-emerald-500/25" /> green bar = safe zone
        </span>
      </div>

      {/* ── Auto-generated DANGER alerts ── */}
      <AnimatePresence>
        {autoAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 animate-bounce text-rose-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-rose-400">
                  ⚠ Automated Instrument Alerts ({autoAlerts.length})
                </span>
              </div>
              {autoAlerts.length > 1 && (
                <button
                  onClick={dismissAll}
                  className="font-mono text-[10px] text-slate-500 transition hover:text-slate-300"
                >
                  Dismiss all
                </button>
              )}
            </div>

            {/* Alert cards */}
            {autoAlerts.map(alert => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden rounded-xl border border-rose-700 bg-rose-950/40"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 h-full w-1 bg-rose-500" />

                <div className="flex items-start gap-3 px-4 py-3 pl-5">
                  {/* Icon */}
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-700 bg-rose-900/60">
                    <XCircle className="h-4 w-4 text-rose-400" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-rose-900/60 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-rose-300">
                        {alert.code}
                      </span>
                      <span className="font-semibold text-white">
                        {alert.name} — DANGER THRESHOLD EXCEEDED
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-rose-200">
                      Current reading:{' '}
                      <span className="font-mono font-bold">
                        {typeof alert.value === 'number'
                          ? (alert.value % 1 === 0 ? alert.value.toFixed(0) : alert.value.toFixed(1))
                          : alert.value}
                        {alert.unit}
                      </span>{' '}
                      is outside safe operating range.
                    </p>
                    <p className="mt-0.5 text-xs text-rose-300/70">
                      Reference: {alert.note}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-rose-400/60">
                      Triggered: {alert.timestamp.toLocaleTimeString()} · Immediate action recommended
                    </p>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="shrink-0 rounded-lg p-1 text-rose-500 transition hover:bg-rose-900/50 hover:text-rose-300"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Animated danger pulse border */}
                <div className="pointer-events-none absolute inset-0 rounded-xl animate-pulse-slow"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.3)' }} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Instrument grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {INSTRUMENT_DEFS.map((def, idx) => (
            <InstrumentCard
              key={def.id}
              def={def}
              value={readings[def.id] ?? def.baseValue}
              state={states[def.id] ?? 'ACTIVE'}
              delay={idx * 0.07}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
          <Satellite className="h-3 w-3" />
          Data Link: Iridium Satellite · 128-bit AES
        </span>
        {lastUpdate && (
          <span className="font-mono text-[10px] text-slate-600">
            Last sync: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * WinteringReadinessScore
 * ─────────────────────────────────────────────────────────────────────────────
 * Single HQ-level composite score (0–100) derived from four pillars:
 *   1. Inventory    — stock levels vs. thresholds & forecast depletion
 *   2. Wellness     — personnel mental/physical health trend
 *   3. Risk         — active hazards + combined-risk alerts
 *   4. Provenance   — data confidence & coverage
 *
 * Visuals:
 *   • Animated SVG arc gauge (main score)
 *   • Per-pillar horizontal bars with icons
 *   • Colour-coded verdict band (CRITICAL / HIGH / MODERATE / GOOD / EXCELLENT)
 *   • Animated counter from 0 → score on mount
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import {
  Package,
  HeartPulse,
  ShieldAlert,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
  Snowflake,
  Info,
} from 'lucide-react';

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Inventory pillar (0-100)
 * Penalises every LOW/HIGH alert and every critical-category risk item.
 */
function scoreInventory(alerts, inventoryRisks = []) {
  let score = 100;
  const inventoryAlerts = alerts.filter(
    (a) => a.alert_type === 'INVENTORY_LOW' || a.category === 'INVENTORY'
  );
  inventoryAlerts.forEach((a) => {
    score -= a.severity === 'CRITICAL' ? 25 : a.severity === 'HIGH' ? 15 : 8;
  });
  inventoryRisks.forEach((r) => {
    score -= r.severity === 'HIGH' ? 12 : 6;
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Wellness pillar (0-100)
 * Derived from personnel count + any WELLNESS alerts.
 */
function scoreWellness(alerts, personnel = []) {
  let score = 100;
  const wellnessAlerts = alerts.filter(
    (a) => a.alert_type === 'WELLNESS_CONCERN' || a.type === 'wellness'
  );
  wellnessAlerts.forEach((a) => {
    score -= a.severity === 'CRITICAL' ? 30 : a.severity === 'HIGH' ? 20 : 10;
  });
  const inactive = personnel.filter((p) => !p.is_active).length;
  score -= inactive * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Risk pillar (0-100)
 * Each active combined-risk or SOS alert reduces score.
 */
function scoreRisk(alerts) {
  let score = 100;
  alerts.forEach((a) => {
    if (a.severity === 'CRITICAL') score -= 28;
    else if (a.severity === 'HIGH') score -= 18;
    else if (a.severity === 'MEDIUM') score -= 10;
    else score -= 4;
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Provenance pillar (0-100)
 * Average confidence across alerts that carry a confidence_score.
 */
function scoreProvenance(alerts) {
  const scored = alerts.filter(
    (a) => a.confidence_score != null && !isNaN(Number(a.confidence_score))
  );
  if (scored.length === 0) return 80; // default if no confidence data
  const avg = scored.reduce((s, a) => s + Number(a.confidence_score), 0) / scored.length;
  return Math.round(Math.max(0, Math.min(100, avg)));
}

/**
 * Composite score = weighted average of four pillars.
 */
function computeComposite({ inventory, wellness, risk, provenance }) {
  return Math.round(
    inventory * 0.35 +
    wellness  * 0.30 +
    risk      * 0.25 +
    provenance * 0.10
  );
}

// ── Verdict band ──────────────────────────────────────────────────────────────
function getVerdict(score) {
  if (score >= 85) return { label: 'EXCELLENT',  color: '#10b981', ring: 'rgba(16,185,129,0.35)',  text: 'text-emerald-400' };
  if (score >= 70) return { label: 'GOOD',        color: '#38bdf8', ring: 'rgba(56,189,248,0.35)',  text: 'text-sky-400'     };
  if (score >= 55) return { label: 'MODERATE',    color: '#f59e0b', ring: 'rgba(245,158,11,0.35)',  text: 'text-amber-400'   };
  if (score >= 35) return { label: 'HIGH RISK',   color: '#f97316', ring: 'rgba(249,115,22,0.35)',  text: 'text-orange-400'  };
  return               { label: 'CRITICAL',    color: '#ef4444', ring: 'rgba(239,68,68,0.35)',   text: 'text-rose-400'    };
}

// ── Animated counter hook ─────────────────────────────────────────────────────
function useAnimatedValue(target, duration = 1.4) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    const from = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return display;
}

// ── SVG arc gauge ─────────────────────────────────────────────────────────────
const RADIUS = 72;
const STROKE = 10;
const CX = 92;
const CY = 92;
// Arc spans 220° (starting from 200° so it opens at the bottom like a car speedo)
const ARC_DEG = 220;
const START_DEG = 200;

function polarToXY(deg, r = RADIUS, cx = CX, cy = CY) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(startDeg, endDeg) {
  const s = polarToXY(startDeg);
  const e = polarToXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${e.x} ${e.y}`;
}

const TOTAL_CIRCUMFERENCE = (ARC_DEG / 360) * 2 * Math.PI * RADIUS;

function Gauge({ score, verdict }) {
  const animScore = useAnimatedValue(score);
  const fillRatio = animScore / 100;
  const dashArray = TOTAL_CIRCUMFERENCE;
  const dashOffset = TOTAL_CIRCUMFERENCE * (1 - fillRatio);

  const startDeg = START_DEG;
  const endDeg   = START_DEG + ARC_DEG;
  const arcPath  = describeArc(startDeg, endDeg);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={184} height={184} className="overflow-visible drop-shadow-lg">
        {/* glow filter */}
        <defs>
          <filter id="glow-gauge">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor={verdict.color} />
          </linearGradient>
        </defs>

        {/* track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* filled arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          filter="url(#glow-gauge)"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }}
        />

        {/* tick marks every 20 pts */}
        {[0, 20, 40, 60, 80, 100].map((tick) => {
          const deg = startDeg + (tick / 100) * ARC_DEG;
          const inner = polarToXY(deg, RADIUS - 7);
          const outer = polarToXY(deg, RADIUS + 2);
          return (
            <line
              key={tick}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* centre label */}
        <text x={CX} y={CY - 6} textAnchor="middle" className="font-mono" fill="white" fontSize={32} fontWeight="700" fontFamily="IBM Plex Mono, monospace">
          {animScore}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill={verdict.color} fontSize={10} fontWeight="600" letterSpacing="2" fontFamily="Space Grotesk, sans-serif">
          {verdict.label}
        </text>
        <text x={CX} y={CY + 28} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={8} fontFamily="IBM Plex Mono, monospace">
          / 100
        </text>
      </svg>

      {/* outer glow ring */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 40px 4px ${verdict.ring}` }}
      />
    </div>
  );
}

// ── Pillar bar ────────────────────────────────────────────────────────────────
function PillarBar({ icon: Icon, label, score, weight, color, delay = 0 }) {
  const verdict = getVerdict(score);
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="group"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: `${color}22` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
            {label}
          </span>
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
            ×{weight}
          </span>
        </div>
        <span className={`font-mono text-sm font-bold ${verdict.text}`}>{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: delay + 0.1, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

// ── Trend chip ────────────────────────────────────────────────────────────────
function TrendChip({ delta }) {
  if (delta > 0)  return <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-400"><TrendingUp className="h-3 w-3" />+{delta} pts</span>;
  if (delta < 0)  return <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] text-rose-400"><TrendingDown className="h-3 w-3" />{delta} pts</span>;
  return               <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400"><Minus className="h-3 w-3" />stable</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WinteringReadinessScore({
  alerts     = [],
  personnel  = [],
  stations   = [],
  className  = '',
}) {
  const [showInfo, setShowInfo] = useState(false);

  // Compute pillars
  const inv  = scoreInventory(alerts);
  const well = scoreWellness(alerts, personnel);
  const risk = scoreRisk(alerts);
  const prov = scoreProvenance(alerts);
  const composite = computeComposite({
    inventory:   inv,
    wellness:    well,
    risk:        risk,
    provenance:  prov,
  });

  const verdict = getVerdict(composite);

  // Simulated delta vs previous cycle (in production: store previous in localStorage)
  const prevKey = 'wrs_prev_score';
  const prevScore = parseInt(sessionStorage.getItem(prevKey) || composite, 10);
  const delta = composite - prevScore;
  useEffect(() => { sessionStorage.setItem(prevKey, composite); }, [composite]);

  const pillars = [
    { icon: Package,    label: 'Inventory',   score: inv,  weight: '0.35', color: '#0ea5e9', delay: 0.05 },
    { icon: HeartPulse, label: 'Wellness',     score: well, weight: '0.30', color: '#a78bfa', delay: 0.15 },
    { icon: ShieldAlert,label: 'Risk',         score: risk, weight: '0.25', color: '#f97316', delay: 0.25 },
    { icon: Database,   label: 'Provenance',   score: prov, weight: '0.10', color: '#34d399', delay: 0.35 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 p-6 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(10,14,26,0.95) 60%, rgba(167,139,250,0.06) 100%)',
        boxShadow: `0 0 60px -10px ${verdict.ring}, 0 24px 48px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Background aurora blobs */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
        style={{ background: verdict.color }} />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-10 blur-2xl"
        style={{ background: '#a78bfa' }} />

      {/* Header row */}
      <div className="relative mb-5 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-polar-blue-light" />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-polar-blue-light">
              HQ · composite index
            </p>
          </div>
          <h2 className="font-display text-xl font-bold text-white">
            Wintering Readiness Score
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Inventory · Wellness · Risk · Provenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendChip delta={delta} />
          <button
            onClick={() => setShowInfo(v => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info tooltip */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs text-slate-300"
        >
          <p className="mb-1 font-semibold text-sky-300">How is this calculated?</p>
          <p>Composite = <span className="text-white">Inventory×0.35 + Wellness×0.30 + Risk×0.25 + Provenance×0.10</span></p>
          <p className="mt-1 text-slate-400">Each pillar is 0–100. Penalties applied per active alert severity. Provenance reflects average ML confidence across alerts.</p>
        </motion.div>
      )}

      {/* Main content: gauge + pillars */}
      <div className="relative grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_1fr]">

        {/* Gauge */}
        <div className="flex flex-col items-center gap-2">
          <Gauge score={composite} verdict={verdict} />
          {/* Station count below gauge */}
          <div className="flex gap-3">
            {stations.map((s) => (
              <div key={s.id} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.status === 'ACTIVE' ? '#10b981' : s.status === 'ISOLATED' ? '#f97316' : '#6b7280' }}
                />
                <span className="font-mono text-[9px] uppercase text-slate-500">{s.code || s.name?.slice(0,6)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pillars */}
        <div className="space-y-4">
          {pillars.map((p) => (
            <PillarBar key={p.label} {...p} />
          ))}

          {/* Verdict band */}
          <div
            className="mt-2 flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: `${verdict.color}11`, border: `1px solid ${verdict.color}33` }}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: verdict.color }}>
              {verdict.label}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              station readiness
            </span>
            {/* mini threshold scale */}
            <div className="flex gap-0.5">
              {['CRITICAL','HIGH RISK','MODERATE','GOOD','EXCELLENT'].map((v, i) => (
                <div
                  key={v}
                  className="h-1.5 w-5 rounded-sm"
                  style={{
                    background: ['#ef4444','#f97316','#f59e0b','#38bdf8','#10b981'][i],
                    opacity: verdict.label === v ? 1 : 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

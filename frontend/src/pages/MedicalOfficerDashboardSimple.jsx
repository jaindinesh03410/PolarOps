/**
 * MedicalOfficerDashboardSimple.jsx
 * "Rescue & Wellbeing" — SAR Medical Net module
 *
 * Design intent: polar-station mission telemetry, not SaaS template.
 * Tokens defined inline so this file is self-contained:
 *   bg         #0A1420  deep polar-night navy
 *   panel      #101B2D  one level up, hairline border #1C2B40
 *   cyan       #4FD1E8  active / primary data
 *   green      #7FE0B8  stable / good
 *   amber      #F5A623  elevated-risk
 *   red        #F2545B  critical / active SOS
 *   text-pri   #E8EEF5
 *   text-muted #7C8CA3
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#0A1420',
  panel:     '#101B2D',
  border:    '#1C2B40',
  cyan:      '#4FD1E8',
  green:     '#7FE0B8',
  amber:     '#F5A623',
  red:       '#F2545B',
  textPri:   '#E8EEF5',
  textMuted: '#7C8CA3',
  grid:      'rgba(124,140,163,0.12)',
};

// ── Score → colour (value-based, not category-based) ─────────────────────────
// mood: higher = better   fatigue/stress: lower = better
function moodColor(v)    { return v >= 7 ? T.green : v >= 5 ? T.amber : T.red; }
function fatigueColor(v) { return v <= 4 ? T.green : v <= 6 ? T.amber : T.red; }
function stressColor(v)  { return v <= 4 ? T.green : v <= 6 ? T.amber : T.red; }

// ── Inline sparkline ──────────────────────────────────────────────────────────
function Sparkline({ data, dataKey, color, width = 72, height = 28 }) {
  if (!data || data.length < 2) return <span style={{ color: T.textMuted, fontSize: 10 }}>—</span>;
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
        <Line
          type="monotone" dataKey={dataKey}
          stroke={color} strokeWidth={1.5}
          dot={false} isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Metric pill with value-based colour ──────────────────────────────────────
function MetricPill({ label, value, colorFn }) {
  const color = colorFn(value);
  return (
    <span style={{ fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace', fontSize: 11 }}>
      <span style={{ color: T.textMuted }}>{label} </span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
      <span style={{ color: T.textMuted }}>/10</span>
    </span>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: '18px 20px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section label (sentence-case, no ALL-CAPS tracking) ──────────────────────
function SectionLabel({ children, color = T.cyan }) {
  return (
    <p style={{
      fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace',
      fontSize: 11, fontWeight: 500, color,
      marginBottom: 6, letterSpacing: '0.04em',
    }}>
      {children}
    </p>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: 'IBM Plex Sans, Inter, sans-serif',
      fontSize: 16, fontWeight: 700, color: T.textPri,
      marginBottom: 14, marginTop: 0,
    }}>
      {children}
    </h2>
  );
}

// ── Custom tooltip for main chart ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: '8px 12px',
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
    }}>
      <p style={{ color: T.textMuted, marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Mock data helpers ─────────────────────────────────────────────────────────
const getMockWellness = () => [
  { id: 1, personnel_id: 'p1', checkin_date: '2024-12-15', mood_score: 7, fatigue_level: 5, stress_level: 4, personnel: { full_name: 'Ramesh Gupta' } },
  { id: 2, personnel_id: 'p1', checkin_date: '2024-12-16', mood_score: 6, fatigue_level: 6, stress_level: 5, personnel: { full_name: 'Ramesh Gupta' } },
  { id: 3, personnel_id: 'p1', checkin_date: '2024-12-17', mood_score: 6, fatigue_level: 7, stress_level: 5, personnel: { full_name: 'Ramesh Gupta' } },
  { id: 4, personnel_id: 'p1', checkin_date: '2024-12-18', mood_score: 5, fatigue_level: 7, stress_level: 6, personnel: { full_name: 'Ramesh Gupta' } },
  { id: 5, personnel_id: 'p1', checkin_date: '2024-12-19', mood_score: 5, fatigue_level: 8, stress_level: 6, personnel: { full_name: 'Ramesh Gupta' } },
  { id: 6, personnel_id: 'p2', checkin_date: '2024-12-17', mood_score: 8, fatigue_level: 3, stress_level: 2, personnel: { full_name: 'Sunita Verma' } },
  { id: 7, personnel_id: 'p2', checkin_date: '2024-12-18', mood_score: 8, fatigue_level: 3, stress_level: 3, personnel: { full_name: 'Sunita Verma' } },
  { id: 8, personnel_id: 'p2', checkin_date: '2024-12-19', mood_score: 9, fatigue_level: 2, stress_level: 2, personnel: { full_name: 'Sunita Verma' } },
];

const getMockSOS  = () => [
  { id: 1, event_code: 'SOS-001', severity: 'MEDIUM', message: 'Equipment malfunction near Grid-7', status: 'RESOLVED', personnel: { full_name: 'Ramesh Gupta' } },
];

const getMockPersonnel = () => [
  { id: 'p1', full_name: 'Ramesh Gupta',  role: 'FIELD_CREW',      is_active: true },
  { id: 'p2', full_name: 'Sunita Verma',  role: 'FIELD_CREW',      is_active: true },
  { id: 'p3', full_name: 'Dr. Priya Singh', role: 'MEDICAL_OFFICER', is_active: true },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function MedicalOfficerDashboardSimple() {
  const { personnel } = useAuth();
  const [loading, setLoading]           = useState(true);
  const [wellnessData, setWellnessData] = useState([]);
  const [sosEvents, setSOSEvents]       = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  // tracks IDs that just got new data — triggers entrance animation
  const [updatedIds, setUpdatedIds]     = useState(new Set());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    let wellness = [], sos = [], people = [];
    try { wellness = await api.getAllWellness(); } catch {}
    try { sos      = await api.getAllSOS();      } catch {}
    try { people   = await api.getAllPersonnel(); } catch {}

    setWellnessData(wellness?.length ? wellness : getMockWellness());
    setSOSEvents(sos?.length        ? sos       : getMockSOS());
    setPersonnelList(people?.length ? people    : getMockPersonnel());
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.cyan, fontSize: 13 }}>
          Linking SAR medical net…
        </span>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeSOS   = sosEvents.filter(s => ['OPEN', 'ACKNOWLEDGED'].includes(s.status));
  const hasActiveSOS = activeSOS.length > 0;

  // Per-person: latest check-in + last-5 sparkline series
  const personStats = personnelList.map(p => {
    const checkins = wellnessData
      .filter(w => w.personnel_id === p.id)
      .sort((a, b) => new Date(a.checkin_date) - new Date(b.checkin_date));
    const latest = checkins[checkins.length - 1] ?? null;
    const spark  = checkins.slice(-6).map(c => ({
      date:    c.checkin_date.slice(5),   // MM-DD
      mood:    c.mood_score,
      fatigue: c.fatigue_level,
      stress:  c.stress_level,
    }));
    // At-risk if latest crosses the same thresholds as correlationEngine.js
    const atRisk = latest && (latest.mood_score < 5 || latest.fatigue_level > 7);
    return { ...p, latest, spark, atRisk };
  });

  // Main trend chart: use the person with most check-ins
  const primaryPerson = [...personStats].sort((a, b) => b.spark.length - a.spark.length)[0];
  const trendData = wellnessData
    .filter(w => w.personnel_id === primaryPerson?.id)
    .sort((a, b) => new Date(a.checkin_date) - new Date(b.checkin_date))
    .map(c => ({
      date:    c.checkin_date.slice(5),
      mood:    c.mood_score,
      fatigue: c.fatigue_level,
      stress:  c.stress_level,
    }));

  const avgMood = wellnessData.length
    ? (wellnessData.reduce((s, w) => s + w.mood_score, 0) / wellnessData.length).toFixed(1)
    : '—';
  const openSOS  = activeSOS.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: T.bg, minHeight: '100vh', padding: '0 0 40px', color: T.textPri,
      fontFamily: 'IBM Plex Sans, Inter, system-ui, sans-serif' }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '20px 0 16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: T.cyan,
              marginBottom: 4, letterSpacing: '0.04em' }}>
              Rescue &amp; Wellbeing · SAR medical net
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.textPri, margin: 0, letterSpacing: '-0.02em' }}>
              Personnel Health Monitor
            </h1>
            <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
              Welcome, <strong style={{ color: T.textPri }}>{personnel?.full_name}</strong>
            </p>
          </div>

          {/* Status row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Stat label="Personnel" value={personnelList.filter(p => p.is_active).length} color={T.cyan} />
            <Stat label="Avg mood"  value={avgMood}  color={moodColor(parseFloat(avgMood) || 5)} />
            <Stat label="Open SOS"  value={openSOS}  color={openSOS > 0 ? T.red : T.green} pulse={openSOS > 0} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>

        {/* ── SOS Events — breaks grid when active ──────────────────────── */}
        <AnimatePresence>
          {hasActiveSOS ? (
            <motion.div
              key="sos-active"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'rgba(242,84,91,0.07)',
                border: `1.5px solid ${T.red}`,
                borderRadius: 12, padding: '20px 22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {/* Pulsing dot */}
                <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                    background: T.red, opacity: 0.4, animation: 'ping 1.2s ease-in-out infinite' }} />
                  <span style={{ position: 'relative', display: 'block', width: 10, height: 10,
                    borderRadius: '50%', background: T.red }} />
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
                  color: T.red, letterSpacing: '0.04em' }}>
                  {activeSOS.length} active SOS event{activeSOS.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {activeSOS.map(s => (
                  <SOSCard key={s.id} event={s} active />
                ))}
              </div>
            </motion.div>
          ) : (
            /* Receded — quiet, low-contrast when no active events */
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 12,
              padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%',
                background: T.green, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: T.textMuted }}>
                No active SOS events — all personnel accounted for
              </span>
              {sosEvents.filter(s => s.status === 'RESOLVED').length > 0 && (
                <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10, color: T.textMuted }}>
                  {sosEvents.filter(s => s.status === 'RESOLVED').length} resolved
                </span>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* ── 3-stat KPI row ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <KPIPanel label="Active personnel" value={personnelList.filter(p=>p.is_active).length}
            subtext="on station" color={T.cyan} />
          <KPIPanel label="Avg mood score"   value={avgMood}
            subtext="last check-in cycle" color={moodColor(parseFloat(avgMood)||5)} />
          <KPIPanel label="Wellness alerts"
            value={wellnessData.filter(w=>w.mood_score<5||w.fatigue_level>7).length}
            subtext="readings at risk" color={wellnessData.filter(w=>w.mood_score<5||w.fatigue_level>7).length>0?T.amber:T.green} />
        </div>

        {/* ── Wellbeing trend chart ───────────────────────────────────────── */}
        <Panel>
          <SectionLabel>Wellbeing trend — {primaryPerson?.full_name}</SectionLabel>
          <SectionTitle>Mood · Fatigue · Stress over time</SectionTitle>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="gMood"    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.cyan}  stopOpacity={0.22} />
                    <stop offset="95%" stopColor={T.cyan}  stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gFatigue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.amber} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={T.amber} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gStress"  x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.green} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={T.green} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: T.textMuted, fontSize: 10,
                  fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,10]} tick={{ fill: T.textMuted, fontSize: 10,
                  fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                {/* Thin baseline grid only */}
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="mood"    name="Mood"
                  stroke={T.cyan}  strokeWidth={2} fill="url(#gMood)"    dot={false} />
                <Area type="monotone" dataKey="fatigue" name="Fatigue"
                  stroke={T.amber} strokeWidth={1.5} fill="url(#gFatigue)" dot={false} />
                <Area type="monotone" dataKey="stress"  name="Stress"
                  stroke={T.green} strokeWidth={1.5} fill="url(#gStress)"  dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
            {[['Mood', T.cyan], ['Fatigue', T.amber], ['Stress', T.green]].map(([k,c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: T.textMuted }}>
                <span style={{ width: 20, height: 2, background: c, display: 'inline-block', borderRadius: 1 }} />
                {k}
              </span>
            ))}
          </div>
        </Panel>

        {/* ── Personnel roster with sparklines ───────────────────────────── */}
        <Panel>
          <SectionLabel>Personnel status</SectionLabel>
          <SectionTitle>Latest check-in + trend</SectionTitle>
          <div style={{ display: 'grid', gap: 2 }}>
            {/* Column headers */}
            <div style={{ display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 80px 80px',
              gap: 8, paddingBottom: 8,
              borderBottom: `1px solid ${T.border}`,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: T.textMuted }}>
              <span>Personnel</span>
              <span style={{ textAlign: 'center' }}>Mood</span>
              <span style={{ textAlign: 'center' }}>Fatigue</span>
              <span style={{ textAlign: 'center' }}>Stress</span>
              <span style={{ textAlign: 'center' }}>7-day trend</span>
            </div>

            <AnimatePresence>
              {personStats.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.06 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 80px 80px 80px',
                    gap: 8, alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: `1px solid ${T.border}`,
                    background: p.atRisk ? 'rgba(245,166,35,0.04)' : 'transparent',
                  }}
                >
                  {/* Name + role */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {/* Status dot */}
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: p.latest
                          ? (p.atRisk ? T.amber : T.green)
                          : T.textMuted }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.textPri }}>
                        {p.full_name}
                      </span>
                      {p.atRisk && (
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                          color: T.amber, border: `1px solid ${T.amber}`,
                          borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>
                          elevated
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, marginLeft: 14 }}>
                      {p.role?.replace(/_/g, ' ').toLowerCase()}
                    </div>
                  </div>

                  {/* Mood */}
                  <div style={{ textAlign: 'center' }}>
                    {p.latest
                      ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15,
                          fontWeight: 700, color: moodColor(p.latest.mood_score) }}>
                          {p.latest.mood_score}
                        </span>
                      : <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>}
                  </div>

                  {/* Fatigue */}
                  <div style={{ textAlign: 'center' }}>
                    {p.latest
                      ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15,
                          fontWeight: 700, color: fatigueColor(p.latest.fatigue_level) }}>
                          {p.latest.fatigue_level}
                        </span>
                      : <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>}
                  </div>

                  {/* Stress */}
                  <div style={{ textAlign: 'center' }}>
                    {p.latest
                      ? <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 15,
                          fontWeight: 700, color: stressColor(p.latest.stress_level) }}>
                          {p.latest.stress_level}
                        </span>
                      : <span style={{ color: T.textMuted, fontSize: 11 }}>—</span>}
                  </div>

                  {/* Sparkline — mood trend */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Sparkline
                      data={p.spark} dataKey="mood"
                      color={p.atRisk ? T.amber : T.cyan}
                      width={72} height={28}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {personStats.length === 0 && (
              <p style={{ color: T.textMuted, fontSize: 12, padding: '16px 0', textAlign: 'center' }}>
                No personnel data available
              </p>
            )}
          </div>
        </Panel>

        {/* ── Recent check-ins ────────────────────────────────────────────── */}
        <Panel>
          <SectionLabel>Check-in log</SectionLabel>
          <SectionTitle>Recent submissions</SectionTitle>
          <div style={{ display: 'grid', gap: 1 }}>
            {wellnessData.slice().reverse().slice(0, 8).map((w, idx) => {
              const atRisk = w.mood_score < 5 || w.fatigue_level > 7;
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '9px 0',
                    borderBottom: `1px solid ${T.border}`,
                    borderLeft: atRisk ? `2px solid ${T.amber}` : `2px solid transparent`,
                    paddingLeft: atRisk ? 10 : 0,
                  }}
                >
                  {/* Date + name */}
                  <div style={{ minWidth: 90 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                      color: T.textMuted }}>
                      {new Date(w.checkin_date).toLocaleDateString('en-IN',
                        { day:'2-digit', month:'short' })}
                    </span>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: T.textPri, fontWeight: 500 }}>
                    {w.personnel?.full_name ?? '—'}
                  </div>
                  {/* Scores */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <MetricPill label="M" value={w.mood_score}    colorFn={moodColor}    />
                    <MetricPill label="F" value={w.fatigue_level} colorFn={fatigueColor} />
                    <MetricPill label="S" value={w.stress_level}  colorFn={stressColor}  />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>

        {/* ── All SOS events (resolved) ──────────────────────────────────── */}
        {sosEvents.some(s => s.status === 'RESOLVED') && (
          <Panel>
            <SectionLabel color={T.textMuted}>SOS event history</SectionLabel>
            <SectionTitle>Resolved incidents</SectionTitle>
            <div style={{ display: 'grid', gap: 8 }}>
              {sosEvents.filter(s => s.status === 'RESOLVED').map(s => (
                <SOSCard key={s.id} event={s} active={false} />
              ))}
            </div>
          </Panel>
        )}

      </div>

      {/* Ping keyframe injected inline */}
      <style>{`
        @keyframes ping {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value, color, pulse = false }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 64 }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 800,
        color, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        {pulse && (
          <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-block' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%',
              background: color, opacity: 0.4, animation: 'ping 1.2s ease-in-out infinite' }} />
            <span style={{ position: 'relative', display: 'block', width: 8, height: 8,
              borderRadius: '50%', background: color }} />
          </span>
        )}
        {value}
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
        color: '#7C8CA3', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function KPIPanel({ label, value, subtext, color }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 28,
        fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EEF5', marginTop: 5 }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
        color: '#7C8CA3', marginTop: 2 }}>{subtext}</div>
    </div>
  );
}

function SOSCard({ event, active }) {
  const borderColor = active ? '#F2545B' : '#1C2B40';
  const bg          = active ? 'rgba(242,84,91,0.06)' : 'transparent';
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8,
      padding: '12px 14px', background: bg }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
              fontWeight: 700, color: active ? '#F2545B' : '#7C8CA3',
              background: active ? 'rgba(242,84,91,0.12)' : 'rgba(124,140,163,0.1)',
              borderRadius: 4, padding: '2px 7px' }}>
              {event.event_code}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600,
              color: active ? '#E8EEF5' : '#7C8CA3' }}>
              {event.personnel?.full_name}
            </span>
          </div>
          <p style={{ fontSize: 13, color: active ? '#E8EEF5' : '#7C8CA3',
            margin: 0, lineHeight: 1.5 }}>
            {event.message}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
            color: event.status === 'RESOLVED' ? '#7FE0B8' : '#F2545B',
            background: event.status === 'RESOLVED' ? 'rgba(127,224,184,0.1)' : 'rgba(242,84,91,0.1)',
            borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {event.status}
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
            color: '#7C8CA3', textTransform: 'uppercase' }}>
            {event.severity}
          </span>
        </div>
      </div>
    </div>
  );
}

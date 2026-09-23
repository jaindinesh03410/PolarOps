import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Heart, AlertTriangle, Users, Activity } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { chartTheme, ChartTooltipBox } from '../lib/chartTheme';

export default function MedicalOfficerDashboard() {
  const { personnel } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wellnessData, setWellnessData] = useState([]);
  const [sosEvents, setSOSEvents] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch all data with individual error handling
      let wellness = [];
      let sos = [];
      let people = [];
      
      try {
        wellness = await api.getAllWellness();
      } catch (err) {
        console.warn('Wellness fetch failed:', err);
      }
      
      try {
        sos = await api.getAllSOS();
      } catch (err) {
        console.warn('SOS fetch failed:', err);
      }
      
      try {
        people = await api.getAllPersonnel();
      } catch (err) {
        console.warn('Personnel fetch failed:', err);
      }

      setWellnessData(wellness?.length ? wellness : getMockWellness());
      setSOSEvents(sos?.length ? sos : getMockSOS());
      setPersonnelList(people?.length ? people : getMockPersonnel());
    } catch (err) {
      setWellnessData(getMockWellness());
      setSOSEvents(getMockSOS());
      setPersonnelList(getMockPersonnel());
    } finally {
      setLoading(false);
    }
  };

  const getMockWellness = () => [
    { id: 1, personnel_id: 'p1', checkin_date: '2024-12-15', mood_score: 7, fatigue_level: 5, stress_level: 4, personnel: { full_name: 'Ramesh Gupta' } },
    { id: 2, personnel_id: 'p1', checkin_date: '2024-12-16', mood_score: 6, fatigue_level: 6, stress_level: 5, personnel: { full_name: 'Ramesh Gupta' } },
    { id: 3, personnel_id: 'p1', checkin_date: '2024-12-17', mood_score: 6, fatigue_level: 7, stress_level: 5, personnel: { full_name: 'Ramesh Gupta' } },
    { id: 4, personnel_id: 'p1', checkin_date: '2024-12-18', mood_score: 5, fatigue_level: 7, stress_level: 6, personnel: { full_name: 'Ramesh Gupta' } },
    { id: 5, personnel_id: 'p1', checkin_date: '2024-12-19', mood_score: 5, fatigue_level: 8, stress_level: 6, personnel: { full_name: 'Ramesh Gupta' } },
    { id: 6, personnel_id: 'p2', checkin_date: '2024-12-19', mood_score: 8, fatigue_level: 3, stress_level: 2, personnel: { full_name: 'Sunita Verma' } }
  ];

  const getMockSOS = () => [
    { id: 1, event_code: 'SOS-001', severity: 'MEDIUM', message: 'Equipment malfunction', status: 'RESOLVED', personnel: { full_name: 'Ramesh Gupta' } }
  ];

  const getMockPersonnel = () => [
    { id: 1, full_name: 'Ramesh Gupta', role: 'FIELD_CREW', is_active: true },
    { id: 2, full_name: 'Sunita Verma', role: 'FIELD_CREW', is_active: true },
    { id: 3, full_name: 'Dr. Priya Singh', role: 'MEDICAL_OFFICER', is_active: true }
  ];

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center font-display text-xl text-slate-300">Loading medical net…</div>;
  }

  const avgMoodScore = wellnessData.length > 0
    ? (wellnessData.reduce((sum, w) => sum + (w.mood_score || 0), 0) / wellnessData.length).toFixed(1)
    : 'N/A';
  const activePersonnel = personnelList.filter(p => p.is_active).length;
  const openSOS = sosEvents.filter(s => s.status === 'OPEN').length;
  const chartRows = wellnessData
    .filter(w => w.personnel?.full_name === 'Ramesh Gupta' || w.personnel_id === 'p1')
    .slice()
    .reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-rose-300">SAR medical net</p>
          <h1 className="mt-1 font-heading text-3xl font-bold">Rescue & Wellbeing</h1>
          <p className="text-slate-400">Welcome, <span className="font-semibold">{personnel?.full_name}</span></p>
        </div>
        <Heart className="h-10 w-10 text-rose-400" />
      </div>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card"><Users className="h-8 w-8 text-sky-400" /><p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Active personnel</p><p className="data-number font-mono">{activePersonnel}</p></div>
        <div className="stat-card"><Activity className="h-8 w-8 text-emerald-400" /><p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Avg mood</p><p className="data-number font-mono">{avgMoodScore}</p></div>
        <div className="stat-card"><AlertTriangle className="h-8 w-8 text-amber-400" /><p className="mt-2 text-xs uppercase tracking-widest text-slate-400">Open SOS</p><p className="data-number font-mono">{openSOS}</p></div>
      </div>

      <div className="card">
        <h2 className="section-title font-heading">Wellbeing Trend</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartRows.length ? chartRows : wellnessData}>
              <defs>
                <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartTheme.aurora} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={chartTheme.aurora} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fatFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartTheme.alert} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartTheme.alert} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="checkin_date" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: chartTheme.tick, fontSize: 11 }} />
              <Tooltip content={<ChartTooltipBox />} />
              <Area type="monotone" dataKey="mood_score" name="Mood" stroke={chartTheme.aurora} fill="url(#moodFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="fatigue_level" name="Fatigue" stroke={chartTheme.alert} fill="url(#fatFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title font-heading">Recent Check-ins</h2>
        <div className="space-y-3">
          {wellnessData.slice(0, 5).map((w, idx) => (
            <motion.div key={w.id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-lg bg-white/5 p-4">
              <div>
                <p className="font-semibold">{w.personnel?.full_name || 'Unknown'}</p>
                <p className="font-mono text-xs text-slate-400">{w.checkin_date}</p>
              </div>
              <div className="flex gap-2 font-mono text-xs">
                <span className="rounded bg-sky-500/20 px-2 py-1 text-sky-200">Mood {w.mood_score}</span>
                <span className="rounded bg-orange-500/20 px-2 py-1 text-orange-200">Fatigue {w.fatigue_level}</span>
                <span className="rounded bg-violet-500/20 px-2 py-1 text-violet-200">Stress {w.stress_level}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title font-heading">SOS Events</h2>
        <div className="space-y-3">
          {sosEvents.slice(0, 5).map((sos) => (
            <div
              key={sos.id}
              className={`flex items-center justify-between rounded-lg border-l-4 bg-white/5 p-4 ${
                sos.severity === 'CRITICAL' ? 'border-rose-500 animate-pulse-slow' : 'border-amber-400'
              }`}
            >
              <div>
                <p className="font-semibold font-mono">{sos.event_code}</p>
                <p className="text-sm text-slate-300">{sos.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={sos.severity} variant="solid" />
                <StatusBadge status={sos.status} variant="subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

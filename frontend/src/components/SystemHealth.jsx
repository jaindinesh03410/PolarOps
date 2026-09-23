import { useState, useEffect } from 'react';
import { Activity, Database, Zap, Wifi, CloudRain, GitMerge } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

// Reuse the exact same env-var pattern api.js already uses.
// Strip trailing /api from VITE_API_URL to get the bare server root.
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
  .replace(/\/api\/?$/, '');

// ML service has no dedicated frontend env var in api.js (ML calls are
// proxied through the backend), so follow the same fallback pattern.
const ML_BASE = import.meta.env.VITE_ML_URL || 'http://localhost:8001';

const TIMEOUT_MS = 5000;

// cronService.js refreshes weather every 3 h — flag stale after 240 m
const WEATHER_STALE_MINUTES = 240;
// cronService.js runs correlation every 30 m — flag stale after 30 m
const CORRELATION_STALE_MINUTES = 30;

/** fetch with a 5 s AbortController timeout so hung services fail fast */
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Minutes since an ISO timestamp. Returns Infinity if unparseable. */
function minutesSince(iso) {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return ms < 0 ? 0 : Math.floor(ms / 60000);
}

export default function SystemHealth() {
  const [health, setHealth] = useState({
    backend:     'checking',
    database:    'checking',
    ml:          'checking',
    network:     'checking',
    weather:     'checking',
    correlation: 'checking',
  });

  // Human-readable label overrides for the two new dynamic rows
  const [labels, setLabels] = useState({
    weather:     'Weather feed',
    correlation: 'Correlation engine',
  });

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    // ── Network ──────────────────────────────────────────────────────────────
    const networkOk = navigator.onLine;
    setHealth(prev => ({ ...prev, network: networkOk ? 'healthy' : 'down' }));

    // ── Backend API ───────────────────────────────────────────────────────────
    let backendOk = false;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`);
      backendOk = res.ok;
    } catch {
      backendOk = false;
    }
    setHealth(prev => ({ ...prev, backend: backendOk ? 'healthy' : 'down' }));

    // ── Database — derived from fresh backendOk (no stale closure) ────────────
    setHealth(prev => ({ ...prev, database: backendOk ? 'healthy' : 'unknown' }));

    // ── ML Service ────────────────────────────────────────────────────────────
    try {
      const res = await fetchWithTimeout(`${ML_BASE}/health`);
      setHealth(prev => ({ ...prev, ml: res.ok ? 'healthy' : 'down' }));
    } catch {
      setHealth(prev => ({ ...prev, ml: 'down' }));
    }

    // ── Weather feed — most recent weather_snapshots row ──────────────────────
    // Queried directly via Supabase client so this works even when the
    // backend API is down (Supabase is accessed independently).
    try {
      const { data, error } = await supabase
        .from('weather_snapshots')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setHealth(prev => ({ ...prev, weather: 'down' }));
        setLabels(prev => ({ ...prev, weather: 'Weather feed' }));
      } else {
        const mins = minutesSince(data.fetched_at);
        const status = mins <= WEATHER_STALE_MINUTES ? 'healthy' : 'stale';
        setHealth(prev => ({ ...prev, weather: status }));
        setLabels(prev => ({
          ...prev,
          weather: `Last refreshed ${mins}m ago`,
        }));
      }
    } catch {
      setHealth(prev => ({ ...prev, weather: 'down' }));
      setLabels(prev => ({ ...prev, weather: 'Weather feed' }));
    }

    // ── Correlation engine — most recent combined-risk alert ──────────────────
    // COMBINED_RISK / WEATHER_INVENTORY / WEATHER_HAZARD are all produced
    // by correlationEngine.js which runs every 30 m via cronService.js.
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('created_at')
        .in('alert_type', ['COMBINED_RISK', 'WEATHER_INVENTORY', 'WEATHER_HAZARD'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // No combined-risk alerts exist yet — engine may be running fine but
        // hasn't fired a rule; treat as stale rather than down.
        setHealth(prev => ({ ...prev, correlation: 'stale' }));
        setLabels(prev => ({ ...prev, correlation: 'No rules fired yet' }));
      } else {
        const mins = minutesSince(data.created_at);
        const status = mins <= CORRELATION_STALE_MINUTES ? 'healthy' : 'stale';
        setHealth(prev => ({ ...prev, correlation: status }));
        setLabels(prev => ({
          ...prev,
          correlation: `Last run ${mins}m ago`,
        }));
      }
    } catch {
      setHealth(prev => ({ ...prev, correlation: 'down' }));
      setLabels(prev => ({ ...prev, correlation: 'Correlation engine' }));
    }
  };

  // ── Status dot colour ─────────────────────────────────────────────────────
  // 'stale' is amber — a staleness warning, not an outage (distinct from
  // down=rose and healthy=emerald).
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':  return 'bg-emerald-500';
      case 'stale':    return 'bg-amber-400';
      case 'down':     return 'bg-rose-500';
      default:         return 'bg-amber-500'; // 'checking' / 'unknown'
    }
  };

  const services = [
    { key: 'backend',     label: 'API Server',         icon: Activity  },
    { key: 'database',    label: 'Database',            icon: Database  },
    { key: 'ml',          label: 'ML Service',          icon: Zap       },
    { key: 'network',     label: 'Network',             icon: Wifi      },
    { key: 'weather',     label: labels.weather,        icon: CloudRain },
    { key: 'correlation', label: labels.correlation,    icon: GitMerge  },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-emerald-400" />
        System Health
      </h3>
      <div className="space-y-3">
        {services.map(({ key, label, icon: Icon }) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(health[key])} ${
                health[key] === 'checking' ? 'animate-pulse' : ''
              }`} />
              <span className={`text-xs font-mono capitalize ${
                health[key] === 'stale'   ? 'text-amber-400'  :
                health[key] === 'healthy' ? 'text-emerald-400' :
                health[key] === 'down'    ? 'text-rose-400'   :
                'text-slate-400'
              }`}>
                {health[key]}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

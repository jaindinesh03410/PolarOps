import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Wifi, WifiOff, RefreshCw, AlertCircle, Radio } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import SearchBar from './SearchBar';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';

const DARK_ROLES = new Set(['HQ_ADMIN', 'STATION_COMMANDER', 'LOGISTICS_OFFICER', 'MEDICAL_OFFICER', 'FIELD_CREW']);
const POLL_INTERVAL_MS = 30_000; // 30 s

/** Map alert severity → NotificationDropdown type prop */
function severityToType(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'alert';
  if (severity === 'INFO') return 'info';
  return 'success';
}

/** Format a timestamptz string as a relative time label */
function relativeTime(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Layout({ children }) {
  const { personnel, signOut } = useAuth();
  const { isOnline, syncStatus, queuedActions, syncQueue } = useOffline();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // ── Notification state ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const pollRef = useRef(null);

  const mapAlerts = useCallback((alerts) =>
    (alerts || []).map((a) => ({
      id:          a.id,
      type:        severityToType(a.severity),
      title:       a.title || 'Station Alert',
      description: a.message || a.explanation || '',
      time:        relativeTime(a.created_at),
      read:        !!a.is_read,
    })), []);

  const fetchAlerts = useCallback(async () => {
    try {
      // Only unread alerts — already-dismissed ones are is_read=true on the server
      const data = await api.getAlerts(false);
      setNotifications(mapAlerts(data));
    } catch {
      // Network/API unavailable — keep whatever we already have; don't clear list
    }
  }, [mapAlerts]);

  useEffect(() => {
    fetchAlerts();
    pollRef.current = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchAlerts]);

  // ── Dismiss handler ───────────────────────────────────────────────────────
  const handleDismiss = useCallback(async (id) => {
    // 1. Optimistic update — remove from local state immediately so badge
    //    count drops without waiting for the network round-trip.
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // 2. Persist to backend — sets is_read=true permanently.
    //    On the next poll, GET /alerts?isRead=false will naturally exclude it.
    try {
      await api.acknowledgeAlert(id);
    } catch {
      // If the call fails, the notification won't reappear until next poll
      // because we've already removed it from local state.
    }
  }, []);

  const isField = personnel?.role === 'FIELD_CREW';
  const isDark  = DARK_ROLES.has(personnel?.role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleName = (role) => {
    const names = {
      HQ_ADMIN: 'HQ Admin',
      STATION_COMMANDER: 'Station Commander',
      LOGISTICS_OFFICER: 'Logistics Officer',
      MEDICAL_OFFICER: 'Medical Officer',
      FIELD_CREW: 'Field Crew',
    };
    return names[role] || role;
  };

  return (
    <div className={`flex min-h-screen flex-col ${isDark ? 'dark-theme' : ''} ${isField ? 'field-crew-ui' : ''}`}>
      <header className="border-b border-white/10 bg-polar-dark/95 text-white shadow-elevation-4 backdrop-blur-md">
        <div className={`${isField ? 'max-w-5xl px-5 py-5' : 'max-w-7xl px-4 py-4'} mx-auto`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-polar-blue-light" />
                <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">
                  Antarctic Station Ops
                </h1>
              </div>
              <p className={`mt-1 text-slate-300 ${isField ? 'text-base' : 'text-sm'}`}>
                {personnel?.full_name} · {getRoleName(personnel?.role)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Bar */}
              {!isField && (
                <SearchBar 
                  placeholder="Search station, item ID..." 
                  onSearch={setSearchQuery}
                  className="w-64"
                />
              )}

              {/* Notifications */}
              {!isField && (
                <NotificationDropdown
                  notifications={notifications}
                  onDismiss={handleDismiss}
                />
              )}

              <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                isOnline ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-emerald-400" />
                    <span className={`font-mono text-emerald-300 ${isField ? 'text-sm' : 'text-xs'}`}>LINK UP</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-rose-400" />
                    <span className={`font-mono text-rose-300 ${isField ? 'text-sm' : 'text-xs'}`}>OFFLINE</span>
                  </>
                )}
              </div>

              {queuedActions.length > 0 && (
                <button
                  onClick={syncQueue}
                  disabled={!isOnline || syncStatus === 'syncing'}
                  className={`${isField ? 'min-h-[48px] px-4' : 'px-3 py-2'} flex items-center gap-2 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50`}
                >
                  <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus === 'syncing' ? 'Syncing…' : `${queuedActions.length} queued`}
                </button>
              )}

              <button
                onClick={handleSignOut}
                className={`${isField ? 'min-h-[48px] px-5 text-base' : 'px-4 py-2 text-sm'} flex items-center gap-2 rounded-lg bg-white/10 transition hover:bg-white/20`}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-400 px-4 py-3 text-black">
          <div className="mx-auto flex max-w-7xl items-center gap-2 font-semibold">
            <AlertCircle className="h-5 w-5" />
            <span className={isField ? 'text-base' : 'text-sm'}>
              Working offline — actions queue locally and sync when the link returns
            </span>
          </div>
        </div>
      )}

      <main className={`w-full flex-1 ${isField ? 'mx-auto max-w-5xl px-4 py-6' : 'mx-auto max-w-7xl px-4 py-6'}`}>
        {children}
      </main>

      <footer className="border-t border-white/10 bg-polar-dark/80 py-3 text-center font-mono text-[11px] uppercase tracking-widest text-slate-500">
        SIH 26062 · Polar mission control
      </footer>
    </div>
  );
}

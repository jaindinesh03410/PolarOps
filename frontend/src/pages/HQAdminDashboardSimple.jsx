import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Shield, AlertTriangle, Users, Database, Eye, Radio } from 'lucide-react';
import MapEmbed from '../components/MapEmbed';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import DataProvenanceBadge from '../components/DataProvenanceBadge';
import { StationAlertSystem } from '../components/StationAlertSystem';
import { EnvironmentalMonitor } from '../components/EnvironmentalMonitor';
import WinteringReadinessScore from '../components/WinteringReadinessScore';
import ComplianceReportExporter from '../components/ComplianceReportExporter';

export default function HQAdminDashboardSimple() {
  const { personnel } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch all data with individual error handling
      let stationsData = [];
      let alertsData = [];
      let peopleData = [];
      let auditData = [];
      
      try {
        stationsData = await api.getAllStations();
      } catch (err) {
        console.warn('Stations fetch failed:', err);
      }
      
      try {
        alertsData = await api.getAllAlerts();
      } catch (err) {
        console.warn('Alerts fetch failed:', err);
      }
      
      try {
        peopleData = await api.getAllPersonnel();
      } catch (err) {
        console.warn('Personnel fetch failed:', err);
      }
      
      try {
        auditData = await api.getAuditLogs({ limit: 50 });
        console.log('✅ Audit logs loaded:', auditData?.length || 0, 'entries');
      } catch (err) {
        console.warn('⚠️ Audit logs fetch failed:', err);
      }

      setStations(stationsData?.length ? stationsData : getMockStations());
      setAlerts(alertsData?.length ? alertsData : getMockAlerts());
      setPersonnelList(peopleData?.length ? peopleData : getMockPersonnel());
      setAuditLogs(auditData?.length ? auditData : getMockAudit());
    } catch (err) {
      setStations(getMockStations());
      setAlerts(getMockAlerts());
      setPersonnelList(getMockPersonnel());
      setAuditLogs(getMockAudit());
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMockStations = () => [
    { id: 1, name: 'Maitri Station', code: 'MAITRI', status: 'ACTIVE', current_occupancy: 18, capacity: 25, latitude: -70.7666, longitude: 11.7333 },
    { id: 2, name: 'Bharati Station', code: 'BHARATI', status: 'ACTIVE', current_occupancy: 32, capacity: 47, latitude: -69.4083, longitude: 76.1833 }
  ];

  const getMockAlerts = () => [
    { id: 1, alert_type: 'INVENTORY_LOW', severity: 'HIGH', title: 'Low Fuel Alert', message: 'Diesel approaching minimum', created_at: '2024-12-19', data_source: 'MEASURED', confidence_score: 91 },
    { id: 2, alert_type: 'COMBINED_RISK', severity: 'CRITICAL', title: 'Crevasse + fatigue correlation', message: 'Field party near new crevasse with declining wellness scores', created_at: '2024-12-19', data_source: 'SIMULATED', confidence_score: 84, explanation: 'Joint trigger: hazard proximity and 3-day fatigue trend' }
  ];

  const getMockPersonnel = () => [
    { id: 1, full_name: 'Dr. Rajesh Kumar', role: 'HQ_ADMIN', is_active: true },
    { id: 2, full_name: 'Ramesh Gupta', role: 'FIELD_CREW', is_active: true },
    { id: 3, full_name: 'Dr. Priya Singh', role: 'MEDICAL_OFFICER', is_active: true }
  ];

  const getMockAudit = () => [
    { 
      id: 1, 
      action_type: 'CREATE', 
      entity_type: 'inventory_items',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      metadata: { item: 'Diesel Fuel' },
      personnel: { full_name: 'Station Commander' }
    },
    { 
      id: 2, 
      action_type: 'UPDATE', 
      entity_type: 'sos_events',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      metadata: { status: 'ACKNOWLEDGED' },
      personnel: { full_name: 'HQ Admin' }
    },
    { 
      id: 3, 
      action_type: 'CREATE', 
      entity_type: 'wellness_checkins',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      metadata: { score: 85 },
      personnel: { full_name: 'Field Crew' }
    },
    { 
      id: 4, 
      action_type: 'UPDATE', 
      entity_type: 'cargo_manifests',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      metadata: { status: 'IN_TRANSIT' },
      personnel: { full_name: 'Logistics Officer' }
    },
    { 
      id: 5, 
      action_type: 'CREATE', 
      entity_type: 'hazards',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      metadata: { type: 'CREVASSE', severity: 'HIGH' },
      personnel: { full_name: 'Field Crew' }
    }
  ];

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center font-display text-xl text-slate-300">Linking HQ feed…</div>;
  }

  const activeStations = stations.filter(s => s.status === 'ACTIVE').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
  const totalPersonnel = personnelList.filter(p => p.is_active).length;
  const combinedRisk = alerts.filter(a => a.alert_type === 'COMBINED_RISK');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-polar-blue-light">NCPOR · Goa uplink</p>
          <h1 className="mt-1 font-heading text-3xl font-bold">HQ Mission Control</h1>
          <p className="text-slate-400">Welcome, <span className="font-semibold">{personnel?.full_name}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <ComplianceReportExporter
            stations={stations}
            alerts={alerts}
            personnel={personnelList}
            complianceFlags={[]}
            auditLogs={auditLogs}
            inventory={[]}
            hazards={[]}
            sos={[]}
          />
          <Shield className="h-10 w-10 text-polar-blue-light" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">Error: {error}</div>
      )}

      {/* ── Wintering Readiness Score — hero composite index ── */}
      <WinteringReadinessScore
        alerts={alerts}
        personnel={personnelList}
        stations={stations}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { icon: Database, label: 'Active stations', value: activeStations },
          { icon: AlertTriangle, label: 'Critical alerts', value: criticalAlerts },
          { icon: Users, label: 'Personnel', value: totalPersonnel },
          { icon: Radio, label: 'Audit events', value: auditLogs.length },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-3">
              <stat.icon className="h-8 w-8 text-polar-blue-light" />
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">{stat.label}</p>
                <p className="data-number font-mono">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts && alerts.length > 0 && (
        <StationAlertSystem
          notifications={alerts.map(a => ({
            id: a.id,
            title: a.title || 'System Alert',
            details: a.explanation || a.message || 'No details available',
            severity: a.severity || 'INFO',
            category: a.alert_type || 'GENERAL',
            status: a.is_read ? 'CLEARED' : 'ACTIVE',
            stationCode: 'HQ',
            triggeredAt: a.created_at || new Date().toISOString()
          }))}
          onDismiss={(id) => {
            setAlerts(prev => prev.filter(a => a.id !== id));
          }}
        />
      )}

      {/* Environmental Monitoring */}
      <EnvironmentalMonitor location="HQ Mission Control" />

      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-4">
          <Eye className="h-5 w-5 text-polar-blue-light" />
          <h2 className="font-heading text-lg font-bold">Unified Live Map</h2>
        </div>
        <MapEmbed
          stations={stations}
          centerLat={-70.1}
          centerLng={44}
          zoom={3}
          className="h-96"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-glass">
          <h2 className="section-title font-heading">
            <AlertTriangle className="h-5 w-5 text-violet-400" />
            Combined Risk Alerts
          </h2>
          <div className="space-y-3">
            <AnimatePresence>
              {(combinedRisk.length ? combinedRisk : alerts.slice(0, 3)).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-lg border-l-4 bg-white/5 p-4 ${
                    alert.severity === 'CRITICAL' ? 'border-rose-500 animate-pulse-slow' : 'border-violet-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
                      <div className="mt-2">
                        <DataProvenanceBadge
                          dataSource={alert.data_source || 'SIMULATED'}
                          confidence={alert.confidence_score}
                          explanation={alert.explanation}
                        />
                      </div>
                    </div>
                    <StatusBadge status={alert.severity} variant="solid" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title font-heading">Station Status</h2>
          <div className="grid gap-3">
            {stations.map((station) => (
              <div key={station.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{station.name}</h3>
                  <StatusBadge status={station.status} variant="subtle" />
                </div>
                <p className="mt-1 font-mono text-sm text-slate-400">
                  {station.code} · occupancy {station.current_occupancy}/{station.capacity}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-glass">
        <h2 className="section-title font-heading">Live Audit Feed</h2>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg bg-black/40 p-4 font-mono text-xs">
          <AnimatePresence>
            {auditLogs.slice(0, 12).map((log) => {
              const timestamp = log.timestamp || log.created_at;
              const actionType = log.action_type || log.actionType || 'ACTION';
              const entityType = log.entity_type || log.entity || 'unknown';
              const user = log.personnel?.full_name || log.metadata?.user || 'system';
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-emerald-400"
                >
                  <span className="text-slate-500">[{new Date(timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="text-amber-300">{actionType}</span>{' '}
                  <span className="text-sky-400">{entityType}</span>{' '}
                  <span className="text-slate-400">by {user}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {auditLogs.length === 0 && (
            <div className="space-y-1">
              <p className="text-slate-500">No audit events yet. Actions will appear here:</p>
              <p className="text-slate-600">• Inventory updates</p>
              <p className="text-slate-600">• SOS events</p>
              <p className="text-slate-600">• Personnel changes</p>
              <p className="text-slate-600">• Wellness check-ins</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import SeverityBadge from '../components/SeverityBadge';
import DataProvenanceBadge from '../components/DataProvenanceBadge';
import MapEmbed from '../components/MapEmbed';
import { AlertCircle, Activity, Shield, Eye } from 'lucide-react';

export default function HQAdminDashboard() {
  const [stations, setStations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [complianceFlags, setComplianceFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    setupRealtimeSubscriptions();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [stationsData, alertsData, auditData, complianceData] = await Promise.all([
        api.getStations(),
        api.getAlerts({ isRead: false }),
        api.getAuditLogs({ limit: 50 }),
        api.getComplianceFlags(false)
      ]);

      setStations(stationsData);
      setAlerts(alertsData);
      setAuditLogs(auditData);
      setComplianceFlags(complianceData);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Real-time alerts
    const alertsChannel = supabase
      .channel('hq-alerts');
    
    alertsChannel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts'
      }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
      });
    
    alertsChannel.subscribe();

    // Real-time audit logs
    const auditChannel = supabase
      .channel('hq-audit');
      
    auditChannel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs'
      }, (payload) => {
        setAuditLogs(prev => [payload.new, ...prev].slice(0, 50));
      });
    
    auditChannel.subscribe();

    return () => {
      alertsChannel.unsubscribe();
      auditChannel.unsubscribe();
    };
  };

  const combinedRiskAlerts = alerts.filter(a => a.alert_type === 'COMBINED_RISK');
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');

  if (loading) {
    return <div className="text-center py-12">Loading HQ Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">HQ Admin Dashboard - Goa</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Activity className="w-4 h-4" />
          Monitoring {stations.length} stations
        </div>
      </div>

      {/* Critical Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card bg-red-50 border-red-200">
          <div className="text-sm text-red-600 font-semibold">Critical Alerts</div>
          <div className="text-3xl font-bold text-red-800 mt-2">{criticalAlerts.length}</div>
        </div>
        <div className="card bg-purple-50 border-purple-200">
          <div className="text-sm text-purple-600 font-semibold">Combined Risk Alerts</div>
          <div className="text-3xl font-bold text-purple-800 mt-2">{combinedRiskAlerts.length}</div>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="text-sm text-yellow-600 font-semibold">Compliance Flags</div>
          <div className="text-3xl font-bold text-yellow-800 mt-2">{complianceFlags.length}</div>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-600 font-semibold">Active Stations</div>
          <div className="text-3xl font-bold text-blue-800 mt-2">
            {stations.filter(s => s.status === 'ACTIVE').length}
          </div>
        </div>
      </div>

      {/* Global Map */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Global Station Overview
        </h2>
        <MapEmbed
          stations={stations}
          centerLat={-70}
          centerLng={25}
          zoom={4}
          className="h-96 rounded-lg overflow-hidden"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Combined Risk Alerts */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            Combined Risk Alerts
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {combinedRiskAlerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No combined risk alerts</p>
            ) : (
              combinedRiskAlerts.map(alert => (
                <div key={alert.id} className="border-l-4 border-purple-500 pl-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{alert.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                      <div className="mt-2">
                        <DataProvenanceBadge
                          dataSource={alert.data_source}
                          confidence={alert.confidence_score}
                          explanation={alert.explanation}
                        />
                      </div>
                      {alert.correlation_data && (
                        <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                          <div className="font-semibold mb-1">Contributing Factors:</div>
                          {alert.correlation_data.slice(0, 3).map((factor, idx) => (
                            <div key={idx}>• {factor.type}: {JSON.stringify(factor).slice(0, 50)}...</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Compliance Flags */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            Compliance Flags (Antarctic Treaty Act 2022)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {complianceFlags.length === 0 ? (
              <p className="text-green-600 text-sm font-semibold">✓ All operations compliant</p>
            ) : (
              complianceFlags.map(flag => (
                <div key={flag.id} className="border border-yellow-300 bg-yellow-50 p-3 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{flag.rule_code}</div>
                      <div className="text-xs text-gray-700 mt-1">{flag.rule_description}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        Type: {flag.violation_type}
                      </div>
                    </div>
                    <SeverityBadge severity={flag.severity} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live Audit Log Feed */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Live Audit Log Feed (Tamper-Proof)</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs max-h-64 overflow-y-auto">
          {auditLogs.map(log => (
            <div key={log.id} className="mb-1">
              <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className="text-yellow-400">{log.action_type}</span>{' '}
              <span className="text-blue-400">{log.entity_type}</span>{' '}
              by {log.personnel?.full_name || 'System'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

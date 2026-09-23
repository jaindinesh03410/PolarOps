import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { chartTheme, ChartTooltipBox } from '../lib/chartTheme';
import { motion } from 'framer-motion';
import DataProvenanceBadge from '../components/DataProvenanceBadge';
import StatusBadge from '../components/StatusBadge';
import AddInventoryModal from '../components/AddInventoryModal';
import ExportButton from '../components/ExportButton';
import SystemHealth from '../components/SystemHealth';
import EnterpriseKPI from '../components/EnterpriseKPI';
import ActionButton from '../components/ActionButton';
import { Users, Package, AlertTriangle, Plus, Activity, Trash2 } from 'lucide-react';
import { StationAlertSystem } from '../components/StationAlertSystem';
import { EnvironmentalMonitor } from '../components/EnvironmentalMonitor';
import { ResourceTracker } from '../components/ResourceTracker';

export default function StationCommanderDashboard() {
  const { personnel } = useAuth();
  const toast = useToast();
  const [stationData, setStationData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  // personnelId → { mood_score, fatigue_level } of their most recent check-in
  // null  = fetch failed / no data (shown as gray "no data" dot — not green)
  const [wellnessMap, setWellnessMap] = useState({});

  useEffect(() => {
    if (personnel?.station_id) {
      loadDashboard();
    }
  }, [personnel]);

  // Fetch the latest wellness check-in for every person in the roster.
  // Runs after stationData is populated so we have the personnel list.
  // Uses Promise.allSettled — one failed fetch never blocks the others.
  useEffect(() => {
    const people = stationData?.personnel;
    if (!people || people.length === 0) return;

    (async () => {
      const results = await Promise.allSettled(
        people.map(p => api.getPersonnelWellness(p.id))
      );

      const map = {};
      results.forEach((result, idx) => {
        const id = people[idx].id;
        if (result.status === 'fulfilled') {
          const checkins = result.value || [];
          if (checkins.length === 0) {
            map[id] = null; // no check-in data — must not default to green
          } else {
            // Most recent check-in (sort descending by date)
            const sorted = [...checkins].sort(
              (a, b) => new Date(b.checkin_date) - new Date(a.checkin_date)
            );
            const latest = sorted[0];
            map[id] = {
              mood_score:    latest.mood_score,
              fatigue_level: latest.fatigue_level,
            };
          }
        } else {
          map[id] = null; // fetch failed — treat same as no data
        }
      });

      setWellnessMap(map);
    })();
  }, [stationData?.personnel]);

  const loadDashboard = async () => {
    try {
      const [dashboardData, inventoryData, alertsData] = await Promise.all([
        api.getStationDashboard(personnel.station_id),
        api.getStationInventory(personnel.station_id),
        api.getAlerts({ })
      ]);

      setStationData(dashboardData);
      setInventory(inventoryData);
      setAlerts(alertsData.filter(a => a.station_id === personnel.station_id));
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const forecastItem = async (itemId) => {
    try {
      const result = await api.forecastInventory(itemId);
      console.log('✅ Forecast generated:', result);
      toast.success('Forecast generated successfully!');
      await loadDashboard();
    } catch (error) {
      console.error('❌ Forecast error:', error);
      toast.error('Failed to generate forecast. Please try again.');
    }
  };

  const handleAddInventory = async (itemData) => {
    try {
      console.log('📦 Adding inventory item:', itemData);
      const result = await api.addInventory(itemData);
      console.log('✅ Item added successfully:', result);
      toast.success('Inventory item added successfully!');
      loadDashboard();
    } catch (error) {
      console.error('❌ Add inventory error:', error);
      toast.error('Failed to add inventory item');
      throw new Error('Failed to add inventory item: ' + error.message);
    }
  };

  const handleRemoveItem = async (itemId, itemName) => {
    if (!window.confirm(`Remove "${itemName}" from inventory?`)) return;
    try {
      await api.deleteInventoryItem(itemId);
      toast.success(`${itemName} removed from inventory`);
      // Optimistic: remove from local state immediately
      setInventory(prev => prev.filter(i => i.id !== itemId));
    } catch (error) {
      console.error('❌ Remove inventory error:', error);
      toast.error('Failed to remove item — backend may be offline');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading Station Dashboard...</div>;
  }

  const lowInventoryItems = inventory.filter(item => 
    item.current_quantity <= item.minimum_threshold
  );

  const personnelCount = stationData?.personnel?.length || 0;
  const capacity = stationData?.station?.capacity || 25;
  const activeSOS = stationData?.activeSOS?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-polar-blue-light">Station command</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">Station Commander</h1>
        <p className="text-slate-400 font-sans">
          <span className="font-semibold">{stationData?.station?.name}</span> <span className="font-mono">({stationData?.station?.code})</span>
        </p>
      </div>

      {/* Enterprise KPI Cards - Modern Style */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <EnterpriseKPI
          title="Personnel"
          value={`${personnelCount}/${capacity}`}
          subtitle="Station Capacity"
          trend={personnelCount > capacity * 0.8 ? 'up' : 'down'}
          trendValue={`${Math.round((personnelCount/capacity) * 100)}% occupied`}
          trendState={personnelCount > capacity * 0.8 ? 'negative' : 'positive'}
          icon={<Users size={18} />}
        />
        <EnterpriseKPI
          title="Low Inventory"
          value={lowInventoryItems.length}
          subtitle="Below Threshold"
          trend={lowInventoryItems.length > 0 ? 'up' : 'down'}
          trendValue={lowInventoryItems.length > 0 ? 'Action Required' : 'All Good'}
          trendState={lowInventoryItems.length > 0 ? 'negative' : 'positive'}
          icon={<Package size={18} />}
          alert={lowInventoryItems.length > 3}
        />
        <EnterpriseKPI
          title="Active Alerts"
          value={alerts.filter(a => !a.is_read).length}
          subtitle="Unread Alerts"
          trend="up"
          trendValue="Needs Review"
          trendState={alerts.filter(a => !a.is_read).length > 5 ? 'negative' : 'neutral'}
          icon={<AlertTriangle size={18} />}
          alert={alerts.filter(a => !a.is_read).length > 5}
        />
        <EnterpriseKPI
          title="Active SOS"
          value={activeSOS}
          subtitle="Emergency Events"
          trend={activeSOS > 0 ? 'up' : 'down'}
          trendValue={activeSOS > 0 ? 'Critical' : 'None'}
          trendState={activeSOS > 0 ? 'negative' : 'positive'}
          icon={<Activity size={18} />}
          alert={activeSOS > 0}
        />
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
            stationCode: stationData?.station?.code || 'BASE',
            triggeredAt: a.created_at || new Date().toISOString()
          }))}
          onDismiss={(id) => {
            setAlerts(prev => prev.filter(a => a.id !== id));
          }}
        />
      )}

      {/* Inventory Forecast Charts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 tracking-tight text-polar-blue-light">
            <Package className="w-5 h-5 text-polar-blue-light" />
            Inventory Management
          </h2>
          <div className="flex items-center gap-2">
            <ExportButton data={inventory} filename="station-inventory" onExport={(type) => toast.info(`Exported as ${type.toUpperCase()}`)} />
            <ActionButton
              icon={Plus}
              onClick={async () => setShowAddModal(true)}
              variant="primary"
              successMessage="Opening..."
              loadingMessage="Loading..."
            >
              Add Item
            </ActionButton>
          </div>
        </div>
        <div className="space-y-6">
          {inventory.length === 0 && (
            <p className="py-6 text-center font-mono text-sm text-slate-500">
              No inventory items yet — add one above.
            </p>
          )}
          {inventory.map(item => {
            const forecast = item.inventory_forecasts?.[0];
            const daysRemaining = forecast 
              ? Math.ceil((new Date(forecast.predicted_depletion_date) - new Date()) / (1000 * 60 * 60 * 24))
              : item.daily_consumption_rate 
                ? Math.ceil(item.current_quantity / item.daily_consumption_rate)
                : null;

            return (
              <div key={item.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{item.item_name}</h3>
                    <div className="text-sm text-gray-600">
                      Current: <span className="font-mono font-bold">{item.current_quantity}</span> {item.unit} | 
                      Min: <span className="font-mono">{item.minimum_threshold}</span> {item.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DataProvenanceBadge
                      dataSource={item.data_source}
                      confidence={item.confidence_score}
                    />
                    {!forecast && (
                      <ActionButton
                        onClick={async () => await forecastItem(item.id)}
                        variant="secondary"
                        successMessage="Complete"
                        loadingMessage="Computing..."
                        className="text-xs min-w-[120px]"
                      >
                        Run Forecast
                      </ActionButton>
                    )}
                    <button
                      onClick={() => handleRemoveItem(item.id, item.item_name)}
                      className="flex items-center gap-1 rounded-lg border border-rose-800/60 bg-rose-950/30 px-2.5 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-900/50 hover:text-rose-300"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                {forecast && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Predicted depletion</div>
                        <div className="font-mono font-bold text-rose-300">
                          {new Date(forecast.predicted_depletion_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">({daysRemaining} days)</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Confidence range</div>
                        <div className="font-mono font-semibold">
                          {forecast.confidence_lower?.toFixed(1)} - {forecast.confidence_upper?.toFixed(1)} {item.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Model confidence</div>
                        <div className="font-mono font-bold text-emerald-400">{forecast.confidence_score}%</div>
                      </div>
                    </div>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                          { day: 0, stock: item.current_quantity, low: item.current_quantity * 0.92, high: item.current_quantity * 1.02 },
                          { day: Math.max(daysRemaining || 1, 1), stock: 0, low: 0, high: Math.max(item.current_quantity * 0.15, 1) },
                        ]}>
                          <defs>
                            <linearGradient id={`stock-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartTheme.polarBlue} stopOpacity={0.45} />
                              <stop offset="100%" stopColor={chartTheme.polarBlue} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke={chartTheme.grid} />
                          <XAxis dataKey="day" tick={{ fill: chartTheme.tick, fontSize: 10 }} />
                          <YAxis tick={{ fill: chartTheme.tick, fontSize: 10 }} />
                          <Tooltip content={<ChartTooltipBox />} />
                          <Area type="monotone" dataKey="high" stroke="none" fill={chartTheme.violet} fillOpacity={0.15} />
                          <Area type="monotone" dataKey="low" stroke="none" fill="#0a0e1a" fillOpacity={0.3} />
                          <Area type="monotone" dataKey="stock" stroke={chartTheme.polarBlue} fill={`url(#stock-${item.id})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {forecast.explanation && (
                      <div className="mt-2 text-xs text-slate-300">{forecast.explanation}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Station Roster */}
      <div className="card">
        <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Station Roster
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stationData?.personnel?.map(person => {
            // ── Wellness dot ────────────────────────────────────────────────
            // Thresholds mirror correlationEngine.js gatherSignals() exactly:
            //   at-risk : avgMood < 5  OR avgFatigue > 7
            //   (no data) → gray — absence of data ≠ "fine"
            const w = wellnessMap[person.id];
            const hasData   = w !== null && w !== undefined;
            const noData    = person.id in wellnessMap && !hasData;
            const atRisk    = hasData && (w.mood_score < 5 || w.fatigue_level > 7);
            const dotColor  = !hasData
              ? 'bg-slate-500'              // gray: no data / not yet loaded
              : atRisk
                ? 'bg-rose-500'             // red: at-risk (matches correlation engine)
                : 'bg-emerald-500';         // green: within safe range
            const tooltip   = noData
              ? 'No wellness check-in data'
              : hasData
                ? `Mood: ${w.mood_score}/10, Fatigue: ${w.fatigue_level}/10`
                : 'Loading…';

            return (
              <div
                key={person.id}
                className="relative rounded-lg border border-white/10 bg-white/5 p-3"
              >
                {/* Wellness status dot — top-right corner, matches MapEmbed station marker */}
                <div
                  className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${dotColor} ${atRisk ? 'animate-pulse' : ''}`}
                  title={tooltip}
                />

                <div className="font-semibold">{person.full_name}</div>
                <div className="text-sm text-slate-400">{person.role.replace('_', ' ')}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{person.specialization}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Alerts */}
      <div className="card">
        <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Station Risk Alerts
        </h2>
        <div className="space-y-2">
          {alerts.filter(a => !a.is_read).map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`border-l-4 py-2 pl-3 ${
                alert.severity === 'CRITICAL' ? 'animate-pulse-slow border-rose-500 bg-rose-500/10' : 'border-amber-400 bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{alert.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{alert.message}</div>
                  {alert.explanation && (
                    <div className="mt-2 text-xs italic text-slate-300">{alert.explanation}</div>
                  )}
                </div>
                <StatusBadge status={alert.severity} variant="solid" />
              </div>
              <div className="mt-2 font-mono text-xs text-slate-500">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </motion.div>
          ))}
          {alerts.filter(a => !a.is_read).length === 0 && (
            <p className="text-gray-500 text-sm">No active alerts</p>
          )}
        </div>
      </div>

      {/* System Health Monitor */}
      <SystemHealth />

      {/* Resource Management & Environmental Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {personnel?.station_id && <ResourceTracker baseId={personnel.station_id} />}
        <EnvironmentalMonitor location={stationData?.station?.name || 'Research Station'} />
      </div>

      {/* Add Inventory Modal */}
      <AddInventoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddInventory}
        stationId={personnel?.station_id}
      />
    </div>
  );
}

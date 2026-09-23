import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import DataProvenanceBadge from '../components/DataProvenanceBadge';
import StatusBadge from '../components/StatusBadge';
import MapEmbed from '../components/MapEmbed';
import ExportButton from '../components/ExportButton';
import ActionButton from '../components/ActionButton';
import EnterpriseKPI from '../components/EnterpriseKPI';
import { Timeline, default as TimelineStep } from '../components/TimelineStep';
import { Package, Route, AlertTriangle, Box } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { chartTheme, ChartTooltipBox } from '../lib/chartTheme';
import { EnvironmentalMonitor } from '../components/EnvironmentalMonitor';
import { ResourceTracker } from '../components/ResourceTracker';

export default function LogisticsOfficerDashboard() {
  const toast = useToast();
  const [cargo, setCargo] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [routeRequest, setRouteRequest] = useState({
    startStation: 'a0000000-0000-0000-0000-000000000001',
    endStation: 'a0000000-0000-0000-0000-000000000002',
    start: { lat: -70.7666, lng: 11.7333 },
    end: { lat: -69.4083, lng: 76.1833 }
  });
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cargoData, routesData, hazardsData, stationsData] = await Promise.all([
        api.getCargo().catch(() => []),
        api.getRoutes().catch(() => []),
        api.getHazards('ACTIVE').catch(() => []),
        api.getAllStations().catch(() => [])
      ]);
      
      console.log('📦 Cargo loaded:', cargoData?.length || 0);
      console.log('⚠️ Hazards loaded:', hazardsData?.length || 0);
      
      setCargo(cargoData.length ? cargoData : getMockCargo());
      setRoutes(routesData || []);
      setHazards(hazardsData.length ? hazardsData : getMockHazards());
      setStations(stationsData || getMockStations());
    } catch (error) {
      console.error('Error loading data:', error);
      setCargo(getMockCargo());
      setHazards(getMockHazards());
      setStations(getMockStations());
    }
  };

  const getMockStations = () => [
    { id: 'a0000000-0000-0000-0000-000000000001', name: 'Maitri Station', code: 'MAITRI', latitude: -70.7666, longitude: 11.7333 },
    { id: 'a0000000-0000-0000-0000-000000000002', name: 'Bharati Station', code: 'BHARATI', latitude: -69.4083, longitude: 76.1833 }
  ];

  const getMockHazards = () => [
    {
      id: 'h0000000-0000-0000-0000-000000000001',
      hazard_type: 'CREVASSE',
      latitude: -70.8,
      longitude: 12.5,
      severity: 'HIGH',
      status: 'ACTIVE',
      detection_method: 'YOLO',
      confidence_score: 88,
      data_source: 'SIMULATED'
    },
    {
      id: 'h0000000-0000-0000-0000-000000000002',
      hazard_type: 'THIN_ICE',
      latitude: -69.5,
      longitude: 75.8,
      severity: 'MEDIUM',
      status: 'ACTIVE',
      detection_method: 'MANUAL',
      confidence_score: 92,
      data_source: 'MEASURED'
    },
    {
      id: 'h0000000-0000-0000-0000-000000000003',
      hazard_type: 'AVALANCHE_ZONE',
      latitude: -70.2,
      longitude: 44.0,
      severity: 'CRITICAL',
      status: 'ACTIVE',
      detection_method: 'SENSOR',
      confidence_score: 95,
      data_source: 'MEASURED'
    }
  ];

  const getMockCargo = () => [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      manifest_code: 'CARGO-2024-12-001',
      status: 'PENDING',
      items: [
        { item_name: 'Medical Supplies', quantity: 50, weight: 120, volume: 2.5, priority: 10 },
        { item_name: 'Food Rations', quantity: 200, weight: 450, volume: 8.0, priority: 9 },
        { item_name: 'Fuel Drums', quantity: 10, weight: 800, volume: 12.0, priority: 8 },
        { item_name: 'Scientific Equipment', quantity: 5, weight: 200, volume: 3.0, priority: 6 },
        { item_name: 'Spare Parts', quantity: 30, weight: 150, volume: 2.0, priority: 5 }
      ]
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      manifest_code: 'CARGO-2024-12-002',
      status: 'IN_TRANSIT',
      items: [
        { item_name: 'Communication Equipment', quantity: 8, weight: 95, volume: 1.8, priority: 9 },
        { item_name: 'Winter Clothing', quantity: 40, weight: 180, volume: 4.5, priority: 7 }
      ]
    }
  ];

  const runOptimization = async () => {
    if (!selectedManifest) return;
    
    try {
      console.log('🎒 Running cargo optimization for:', selectedManifest);
      const result = await api.optimizeCargo(selectedManifest, { maxWeight: 1500, maxVolume: 25 });
      console.log('✅ Optimization result:', result);
      setOptimization(result);
      toast.success('Cargo optimized successfully!');
    } catch (error) {
      console.error('❌ Optimization error:', error);
      toast.error('Failed to optimize cargo: ' + error.message);
    }
  };

  const handleStationChange = (type, stationId) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;
    
    setRouteRequest(prev => ({
      ...prev,
      [type === 'start' ? 'startStation' : 'endStation']: stationId,
      [type]: { lat: station.latitude, lng: station.longitude }
    }));
  };

  const computeRoute = async () => {
    try {
      setComputing(true);
      console.log('🗺️ Computing route from', routeRequest.start, 'to', routeRequest.end);
      
      const result = await api.computeRoute({
        start: routeRequest.start,
        end: routeRequest.end,
        name: 'Computed Route',
        avoidHazards: true
      });
      
      console.log('✅ Route computed:', result);
      setRoutes([result, ...routes]);
      toast.success('Safe route computed successfully!');
    } catch (error) {
      console.error('❌ Route computation error:', error);
      
      // Fallback: Create mock route if ML service is down
      const mockRoute = {
        id: `mock-${Date.now()}`,
        name: 'Computed Route (Mock)',
        start_latitude: routeRequest.start.lat,
        start_longitude: routeRequest.start.lng,
        end_latitude: routeRequest.end.lat,
        end_longitude: routeRequest.end.lng,
        total_distance_km: Math.abs(routeRequest.end.lat - routeRequest.start.lat) * 111 + 
                          Math.abs(routeRequest.end.lng - routeRequest.start.lng) * 85,
        estimated_time_hours: 12,
        path_geojson: {
          type: 'LineString',
          coordinates: [
            [routeRequest.start.lng, routeRequest.start.lat],
            [routeRequest.end.lng, routeRequest.end.lat]
          ]
        },
        confidence_score: 85,
        explanation: 'Direct route calculated (ML service unavailable). This is a simplified route.',
        data_source: 'SIMULATED'
      };
      
      setRoutes([mockRoute, ...routes]);
      toast.warning('ML service unavailable. Showing direct route.');
    } finally {
      setComputing(false);
    }
  };

  const utilData = optimization
    ? [
        { name: 'Used', value: optimization.utilization || 0 },
        { name: 'Free', value: Math.max(0, 100 - (optimization.utilization || 0)) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-polar-blue-light">Traverse ops </p>
        <h1 className="mt-1 font-heading text-3xl font-bold">Logistics Officer</h1>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <EnterpriseKPI
          title="Total Cargo"
          value={cargo.length}
          subtitle="Manifests"
          icon={<Package size={18} />}
          trend="up"
          trendValue="Active"
          trendState="positive"
        />
        <EnterpriseKPI
          title="Computed Routes"
          value={routes.length}
          subtitle="Safe Paths"
          icon={<Route size={18} />}
        />
        <EnterpriseKPI
          title="Active Hazards"
          value={hazards.length}
          subtitle="Risk Zones"
          icon={<AlertTriangle size={18} />}
          alert={hazards.length > 5}
          trend={hazards.length > 5 ? 'up' : 'down'}
          trendState={hazards.length > 5 ? 'negative' : 'positive'}
        />
        <EnterpriseKPI
          title="Optimization"
          value={optimization ? `${optimization.utilization}%` : 'N/A'}
          subtitle="Capacity Used"
          icon={<Box size={18} />}
          trend={optimization?.utilization > 90 ? 'up' : 'down'}
          trendState={optimization?.utilization > 90 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Resource Management & Environmental Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResourceTracker baseId="logistics-hub" />
        <EnvironmentalMonitor location="Logistics Center" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <h2 className="section-title mb-0 font-heading">
            <Route className="h-5 w-5 text-polar-blue-light" />
            A* Route Planner
          </h2>
          <ActionButton
            onClick={computeRoute}
            variant="primary"
            disabled={computing}
            successMessage="Route Computed"
            loadingMessage="Computing..."
          >
            Compute Safe Route
          </ActionButton>
        </div>
        
        {/* Station Selectors */}
        <div className="grid gap-4 px-6 py-4 md:grid-cols-2 border-b border-white/10">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              From Station
            </label>
            <select
              value={routeRequest.startStation}
              onChange={(e) => handleStationChange('start', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-white/15 bg-black/30 text-ice-white focus:ring-2 focus:ring-polar-blue focus:border-transparent transition-all"
            >
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </select>
            <div className="mt-1 font-mono text-xs text-slate-500">
              {routeRequest.start.lat.toFixed(4)}, {routeRequest.start.lng.toFixed(4)}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              To Station
            </label>
            <select
              value={routeRequest.endStation}
              onChange={(e) => handleStationChange('end', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-white/15 bg-black/30 text-ice-white focus:ring-2 focus:ring-polar-blue focus:border-transparent transition-all"
            >
              {stations.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </option>
              ))}
            </select>
            <div className="mt-1 font-mono text-xs text-slate-500">
              {routeRequest.end.lat.toFixed(4)}, {routeRequest.end.lng.toFixed(4)}
            </div>
          </div>
        </div>
        
        <div className="h-96">
          <MapEmbed
            stations={stations}
            hazards={hazards}
            routes={routes}
            centerLat={-70}
            centerLng={40}
            zoom={4}
            className="h-full"
          />
        </div>
        {routes[0] && (
          <div className="m-4 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="font-semibold">Latest route: <span className="font-mono">{routes[0].total_distance_km} km</span> · <span className="font-mono">{routes[0].estimated_time_hours} h</span></div>
            <div className="mt-1 text-sm text-slate-300">{routes[0].explanation}</div>
            <div className="mt-2">
              <DataProvenanceBadge dataSource="SIMULATED" confidence={routes[0].confidence_score} explanation={routes[0].explanation} />
            </div>
          </div>
        )}
      </div>

      {/* Cargo Timeline */}
      <div className="card">
        <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Cargo Shipment Status
        </h2>
        <Timeline>
          <TimelineStep 
            status="complete" 
            title="Cargo Loaded" 
            description="Items secured at origin station"
            date="Dec 15" 
          />
          <TimelineStep 
            status="complete" 
            title="Route Validated" 
            description="Safe path computed and approved"
            date="Dec 16" 
          />
          <TimelineStep 
            status="current" 
            title="In Transit" 
            description="Vehicle en route to destination"
            date="Dec 19" 
          />
          <TimelineStep 
            status="upcoming" 
            title="Delivery Expected" 
            description="ETA at destination station"
            date="Dec 21" 
            isLast={true}
          />
        </Timeline>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 font-heading">
              <Package className="h-5 w-5" />
              Cargo Knapsack
            </h2>
            <ExportButton data={cargo} filename="cargo-manifest" onExport={(type) => toast.info(`Exported as ${type.toUpperCase()}`)} />
          </div>
          <select onChange={(e) => setSelectedManifest(e.target.value)} className="mb-4 w-full rounded-lg border border-white/15 bg-black/30 p-3 text-ice-white">
            <option value="">Select manifest</option>
            {cargo.map(c => <option key={c.id} value={c.id}>{c.manifest_code}</option>)}
          </select>
          <button onClick={runOptimization} disabled={!selectedManifest} className="btn-primary mb-4 disabled:opacity-40">
            Optimize load
          </button>
          {optimization && (
            <div className="space-y-3">
              <div className="h-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={utilData} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={3}>
                      <Cell fill={chartTheme.polarBlue} />
                      <Cell fill="#1e293b" />
                    </Pie>
                    <Tooltip content={<ChartTooltipBox unit="%" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3 text-sm">
                <div className="font-semibold"><span className="font-mono">{optimization.selected_items.length}</span> items selected</div>
                <div className="font-mono text-xs text-slate-300">
                  {optimization.total_weight} kg · {optimization.total_volume} m³ · {optimization.utilization}%
                </div>
                <p className="mt-2 text-xs text-slate-400">{optimization.explanation}</p>
                <DataProvenanceBadge dataSource="SIMULATED" confidence={optimization.confidence_score} explanation={optimization.explanation} />
              </div>
              {optimization.excluded_items?.map((item, i) => (
                <div key={i} className="font-mono text-xs text-rose-300">{item.item_name}: {item.reason}</div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title font-heading">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            Active Hazards
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-left">Severity</th>
                  <th className="p-2 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {hazards.map(h => {
                  const explanation = h.detection_method === 'YOLO' || h.detection_method === 'YOLOV8'
                    ? `AI-detected ${h.hazard_type.toLowerCase()} using computer vision (YOLOv8 model). Confidence: ${h.confidence_score}%`
                    : h.detection_method === 'SENSOR'
                    ? `Detected by field sensors. ${h.hazard_type} identified through automated monitoring systems.`
                    : `Manually reported ${h.hazard_type.toLowerCase()} by field personnel. Verified observation.`;
                  
                  return (
                    <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-white/10">
                      <td className="p-2">{h.hazard_type}</td>
                      <td className="p-2 font-mono text-xs">{h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)}</td>
                      <td className="p-2"><StatusBadge status={h.severity} variant="solid" /></td>
                      <td className="p-2">
                        <DataProvenanceBadge 
                          dataSource={h.detection_method === 'YOLO' || h.detection_method === 'YOLOV8' ? 'SIMULATED' : 'MEASURED'} 
                          confidence={h.confidence_score}
                          explanation={explanation}
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

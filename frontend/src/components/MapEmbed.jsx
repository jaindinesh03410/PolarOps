import { Anchor, Ship, AlertOctagon, Navigation, Waves } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Enhanced MapEmbed - Beautiful Antarctic navigation display
 * Shows stations, hazards, and ship routes with animations
 */
export default function MapEmbed({ 
  stations = [], 
  hazards = [], 
  routes = [],
  centerLat = -70, 
  centerLng = 40,
  zoom = 4,
  className = "h-96"
}) {
  // OpenStreetMap embed (no API key needed)
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 40},${centerLat - 10},${centerLng + 40},${centerLat + 10}&layer=mapnik`;

  return (
    <div className={`relative ${className} overflow-hidden`}>
      {/* Enhanced Map Background with gradient overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
          <iframe
            title="Antarctic Map"
            src={osmUrl}
            className="w-full h-full border-0 opacity-50"
            loading="lazy"
          />
        </div>
        {/* Ice effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 via-transparent to-blue-500/10 pointer-events-none"></div>
      </div>

      {/* Enhanced Overlay with beautiful markers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full relative">
          {/* Station Markers with pulsing rings */}
          {stations.map((station, idx) => {
            const x = ((station.longitude + 180) / 360) * 100;
            const y = ((90 - station.latitude) / 180) * 100;
            const isActive = station.status === 'ACTIVE';
            
            return (
              <motion.div
                key={station.id || idx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.15, type: 'spring', stiffness: 200 }}
                className="absolute pointer-events-auto"
                style={{ 
                  left: `${x}%`, 
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="group relative">
                  {/* Pulsing ring effect for active stations */}
                  {isActive && (
                    <>
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-emerald-400/30"
                        animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 3, repeat: Infinity, delay: idx * 0.3 }}
                        style={{ width: '48px', height: '48px', left: '-12px', top: '-12px' }}
                      />
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-emerald-400/20"
                        animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 + 0.5 }}
                        style={{ width: '48px', height: '48px', left: '-12px', top: '-12px' }}
                      />
                    </>
                  )}
                  
                  {/* Station Icon */}
                  <div className={`relative rounded-xl p-3 backdrop-blur-sm border-2 shadow-2xl transition-all duration-300 group-hover:scale-125 ${
                    isActive 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-300/50 shadow-emerald-500/50' 
                      : 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-300/50 shadow-rose-500/50'
                  }`}>
                    <Anchor className="w-5 h-5 text-white drop-shadow-lg" />
                    {/* Status dot */}
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`} />
                  </div>
                  
                  {/* Enhanced hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 group-hover:translate-y-[-4px]">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-md rounded-xl px-4 py-3 text-xs whitespace-nowrap border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Navigation className="w-3 h-3 text-emerald-400" />
                        <div className="font-bold text-white text-sm">{station.name}</div>
                      </div>
                      <div className="text-emerald-300 font-mono text-[10px] mb-1">CODE: {station.code}</div>
                      {station.current_occupancy !== undefined && (
                        <div className="flex items-center gap-2 text-slate-300 text-[10px] mt-2 pt-2 border-t border-white/10">
                          <span className="text-slate-400">Personnel:</span>
                          <span className="font-bold text-white">{station.current_occupancy}/{station.capacity}</span>
                        </div>
                      )}
                      {/* Arrow pointer */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Enhanced Hazard Markers with warning rings */}
          {hazards.map((hazard, idx) => {
            const x = ((hazard.longitude + 180) / 360) * 100;
            const y = ((90 - hazard.latitude) / 180) * 100;
            const severity = hazard.severity || 'MEDIUM';
            const isCritical = severity === 'CRITICAL' || severity === 'HIGH';
            
            return (
              <motion.div
                key={hazard.id || idx}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.5 + idx * 0.1,
                  type: 'spring',
                  stiffness: 150
                }}
                className="absolute pointer-events-auto"
                style={{ 
                  left: `${x}%`, 
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="group relative">
                  {/* Danger pulse rings */}
                  <motion.div 
                    className={`absolute inset-0 rounded-full ${isCritical ? 'bg-rose-500/40' : 'bg-amber-500/30'}`}
                    animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                    style={{ width: '56px', height: '56px', left: '-20px', top: '-20px' }}
                  />
                  {isCritical && (
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-rose-600/30"
                      animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.2 + 0.3 }}
                      style={{ width: '56px', height: '56px', left: '-20px', top: '-20px' }}
                    />
                  )}
                  
                  {/* Hazard Icon */}
                  <motion.div 
                    className={`relative rounded-lg p-2.5 backdrop-blur-sm border-2 shadow-2xl ${
                      isCritical
                        ? 'bg-gradient-to-br from-rose-600 to-red-700 border-rose-400/60 shadow-rose-500/60'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/60 shadow-amber-500/60'
                    }`}
                    animate={{ rotate: [0, 5, 0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <AlertOctagon className="w-5 h-5 text-white drop-shadow-lg" />
                    {/* Blinking danger indicator */}
                    {isCritical && (
                      <motion.div 
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-300"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  
                  {/* Enhanced hazard tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 group-hover:translate-y-[-4px]">
                    <div className={`backdrop-blur-md rounded-xl px-4 py-3 text-xs whitespace-nowrap border shadow-2xl ${
                      isCritical
                        ? 'bg-gradient-to-br from-rose-900 to-red-900 border-rose-500/30 shadow-rose-500/20'
                        : 'bg-gradient-to-br from-amber-900 to-orange-900 border-amber-500/30 shadow-amber-500/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertOctagon className="w-3 h-3 text-rose-400" />
                        <div className="font-bold text-white text-sm">{hazard.hazard_type || hazard.type}</div>
                      </div>
                      <div className={`font-mono text-[10px] mb-1 ${isCritical ? 'text-rose-300' : 'text-amber-300'}`}>
                        SEVERITY: {severity}
                      </div>
                      <div className="text-slate-300 text-[10px]">
                        Lat: {hazard.latitude?.toFixed(3)} | Lng: {hazard.longitude?.toFixed(3)}
                      </div>
                      {/* Arrow pointer */}
                      <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
                        isCritical ? 'border-t-red-900' : 'border-t-orange-900'
                      }`} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Enhanced Ship Routes with animated path */}
          {routes.length > 0 && routes[0]?.path_geojson && (
            <>
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {routes.slice(0, 1).map((route, idx) => {
                  if (!route.path_geojson?.coordinates) return null;
                  
                  const coords = route.path_geojson.coordinates;
                  const points = coords.map(([lng, lat]) => {
                    const x = ((lng + 180) / 360) * 100;
                    const y = ((90 - lat) / 180) * 100;
                    return `${x}%,${y}%`;
                  }).join(' ');
                  
                  return (
                    <g key={route.id || idx}>
                      {/* Glow effect layer */}
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="8"
                        strokeOpacity="0.2"
                        className="blur-sm"
                      />
                      {/* Main route line with dashed animation */}
                      <polyline
                        points={points}
                        fill="none"
                        stroke="url(#routeGradient)"
                        strokeWidth="4"
                        strokeDasharray="12,8"
                        strokeLinecap="round"
                        className="animate-dash-flow"
                      />
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                          <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1" />
                        </linearGradient>
                      </defs>
                    </g>
                  );
                })}
              </svg>
              
              {/* Animated Ship Icon — follows ALL waypoints, not just 3 */}
              {(() => {
                const coords = routes[0]?.path_geojson?.coordinates;
                if (!coords || coords.length < 2) return null;

                // All coordinates → keyframe arrays so ship follows every bend
                const leftKeyframes = coords.map(
                  ([lng]) => `${((lng + 180) / 360) * 100}%`
                );
                const topKeyframes = coords.map(
                  ([, lat]) => `${((90 - lat) / 180) * 100}%`
                );

                // Clamp to 6–20s using real route ETA so animation feels grounded
                const duration = Math.max(6, Math.min(20, routes[0].estimated_time_hours || 8));

                return (
                  <motion.div
                    className="absolute pointer-events-auto"
                    animate={{ left: leftKeyframes, top: topKeyframes }}
                    transition={{
                      duration,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{ transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="group relative">
                      {/* Ship wake effect */}
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-cyan-400/30 blur-md"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ width: '40px', height: '40px', left: '-12px', top: '-12px' }}
                      />
                      
                      {/* Ship icon */}
                      <div className="relative rounded-full p-3 bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-300/50 shadow-2xl shadow-cyan-500/50 backdrop-blur-sm">
                        <Ship className="w-5 h-5 text-white drop-shadow-lg" />
                        {/* Movement indicator */}
                        <motion.div 
                          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-300"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      </div>
                      
                      {/* Ship tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20">
                        <div className="bg-gradient-to-br from-cyan-900 to-blue-900 backdrop-blur-md rounded-xl px-4 py-3 text-xs whitespace-nowrap border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Waves className="w-3 h-3 text-cyan-400" />
                            <div className="font-bold text-white text-sm">Vessel in Transit</div>
                          </div>
                          <div className="text-cyan-300 font-mono text-[10px]">Following optimal route</div>
                          <div className="text-slate-300 text-[10px] mt-1">
                            Distance: {routes[0].total_distance_km?.toFixed(1)} km
                          </div>
                          <div className="text-slate-300 text-[10px]">
                            ETA: {routes[0].estimated_time_hours?.toFixed(1)} hours
                          </div>
                          {/* Arrow pointer */}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-900" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Enhanced Legend with glassmorphism */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-xl px-4 py-3 border border-white/20 shadow-2xl text-xs space-y-2"
      >
        <div className="font-bold text-white text-sm mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          Map Legend
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Anchor className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-slate-200 font-medium">Research Station</span>
        </div>
        {hazards.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center">
              <AlertOctagon className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-slate-200 font-medium">Hazard Zone</span>
          </div>
        )}
        {routes.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Ship className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-slate-200 font-medium">Ship Route</span>
          </div>
        )}
        <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
          Live tracking active
        </div>
      </motion.div>

      <style>{`
        @keyframes dash-flow {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash-flow {
          animation: dash-flow 2s linear infinite;
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

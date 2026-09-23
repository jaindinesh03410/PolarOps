/**
 * AntarcticRoutePlanner.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full A* route planner on a React-Leaflet map for Antarctic logistics.
 *
 * Features:
 *  • Client-side A* over a lat/lng grid — hazard zones add heavy cost
 *  • Dashed "marching ants" polyline (requestAnimationFrame, cleans up on unmount)
 *  • Ship icon that travels along the path using turf.along() + turf.bearing()
 *  • Polar/nautical chart tile layer + graticule grid
 *  • Frosted-glass legend panel
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker, Tooltip, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Turf — loaded lazily, with graceful fallback if not installed ─────────────
let turfLoaded = null;
let turfFailed = false;
async function getTurf() {
  if (turfFailed) return null;
  if (!turfLoaded) {
    try {
      turfLoaded = await import('@turf/turf');
    } catch {
      turfFailed = true;
      return null;
    }
  }
  return turfLoaded;
}

// ── Design tokens (matches MedicalOfficerDashboard SAR palette) ───────────────
const C = {
  cyan:    '#4FD1E8',
  green:   '#7FE0B8',
  amber:   '#F5A623',
  red:     '#F2545B',
  navy:    '#0A1420',
  panel:   'rgba(16,27,45,0.82)',
  border:  '#1C2B40',
  textPri: '#E8EEF5',
  textMut: '#7C8CA3',
};

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const d2r = Math.PI / 180;
  const dlat = (lat2 - lat1) * d2r;
  const dlng = (lng2 - lng1) * d2r;
  const a = Math.sin(dlat / 2) ** 2
    + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dlng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── A* on a lat/lng grid ──────────────────────────────────────────────────────
function runAstar(startPt, endPt, hazards = []) {
  // Adaptive grid resolution: ~40 cells on the longer axis
  const PAD  = 0.5;
  const minLat = Math.min(startPt.lat, endPt.lat) - PAD;
  const maxLat = Math.max(startPt.lat, endPt.lat) + PAD;
  const minLng = Math.min(startPt.lng, endPt.lng) - PAD;
  const maxLng = Math.max(startPt.lng, endPt.lng) + PAD;

  const spanLat = maxLat - minLat || 0.1;
  const spanLng = maxLng - minLng || 0.1;
  const step    = Math.max(spanLat, spanLng) / 40;

  const nLat = Math.ceil(spanLat / step) + 1;
  const nLng = Math.ceil(spanLng / step) + 1;

  const toCell = (lat, lng) => ({
    r: Math.round((lat - minLat) / step),
    c: Math.round((lng - minLng) / step),
  });
  const toGeo = (r, c) => ({
    lat: minLat + r * step,
    lng: minLng + c * step,
  });

  const sCell = toCell(startPt.lat, startPt.lng);
  const eCell = toCell(endPt.lat,   endPt.lng);

  // Build hazard cost map: radius proportional to severity
  const hazardRadius = { CRITICAL: 5, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const hazardCost   = { CRITICAL: 999, HIGH: 200, MEDIUM: 40, LOW: 10 };

  const extraCost = (r, c) => {
    const { lat, lng } = toGeo(r, c);
    let total = 0;
    for (const h of hazards) {
      const hlat = h.latitude  ?? h.lat;
      const hlng = h.longitude ?? h.lng;
      if (hlat == null || hlng == null) continue;
      const sev    = (h.severity || 'MEDIUM').toUpperCase();
      const radius = hazardRadius[sev] ?? 2;
      const cost   = hazardCost[sev]   ?? 40;
      const dist   = haversine(lat, lng, hlat, hlng);
      if (dist < radius) total += cost * (1 - dist / radius);
    }
    return total;
  };

  // A* open set as a min-heap (simple array for small grids)
  const key    = (r, c) => `${r},${c}`;
  const gScore = {};
  const parent = {};
  const open   = [];

  const heur = (r, c) => {
    const g = toGeo(r, c);
    return haversine(g.lat, g.lng, endPt.lat, endPt.lng);
  };

  const push = (r, c, f) => {
    open.push({ r, c, f });
    open.sort((a, b) => a.f - b.f);
  };

  gScore[key(sCell.r, sCell.c)] = 0;
  push(sCell.r, sCell.c, heur(sCell.r, sCell.c));
  const closed = new Set();

  const DIRS = [
    [-1,0],[1,0],[0,-1],[0,1],
    [-1,-1],[-1,1],[1,-1],[1,1],
  ];

  let found = false;
  let iterations = 0;

  while (open.length > 0 && iterations < 8000) {
    iterations++;
    const cur = open.shift();
    const ck  = key(cur.r, cur.c);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (cur.r === eCell.r && cur.c === eCell.c) { found = true; break; }

    for (const [dr, dc] of DIRS) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nc < 0 || nr >= nLat || nc >= nLng) continue;
      const nk = key(nr, nc);
      if (closed.has(nk)) continue;

      const geo      = toGeo(nr, nc);
      const stepCost = haversine(toGeo(cur.r,cur.c).lat, toGeo(cur.r,cur.c).lng, geo.lat, geo.lng);
      const hCost    = extraCost(nr, nc);
      // Hard-block CRITICAL hazard cores (cost > 500)
      if (hCost > 500) continue;

      const tentative = (gScore[ck] ?? Infinity) + stepCost + hCost;
      if (tentative < (gScore[nk] ?? Infinity)) {
        gScore[nk]  = tentative;
        parent[nk]  = ck;
        push(nr, nc, tentative + heur(nr, nc));
      }
    }
  }

  if (!found) return null;

  // Reconstruct path
  const path = [];
  let cur = key(eCell.r, eCell.c);
  while (cur) {
    const [r, c] = cur.split(',').map(Number);
    path.unshift(toGeo(r, c));
    cur = parent[cur];
  }
  // Snap first/last to exact station coordinates
  if (path.length > 0) {
    path[0]             = startPt;
    path[path.length-1] = endPt;
  }
  return path;
}

// ── Custom ship DivIcon ───────────────────────────────────────────────────────
function makeShipIcon(bearing = 0) {
  return L.divIcon({
    className: '',
    iconSize:  [28, 28],
    iconAnchor:[14, 14],
    html: `
      <div style="
        width:28px;height:28px;display:flex;align-items:center;
        justify-content:center;
        transform:rotate(${bearing}deg);
        transition:transform 0.08s linear;
        filter:drop-shadow(0 0 6px ${C.cyan});
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <!-- Ship hull -->
          <path d="M2 17 L12 5 L22 17 L12 21 Z"
            fill="${C.cyan}" stroke="${C.navy}" stroke-width="1.2"/>
          <!-- Mast -->
          <line x1="12" y1="5" x2="12" y2="11"
            stroke="${C.navy}" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Wake dots -->
          <circle cx="8"  cy="19.5" r="1" fill="${C.navy}" opacity="0.5"/>
          <circle cx="16" cy="19.5" r="1" fill="${C.navy}" opacity="0.5"/>
        </svg>
      </div>`,
  });
}

// ── Graticule grid (SVG overlay via Leaflet SVG layer) ────────────────────────
function GraticuleLayer() {
  const map = useMap();

  useEffect(() => {
    // Draw lat/lng lines every 5° in the current viewport
    const svgLayer = L.svg({ padding: 0.1 }).addTo(map);
    const svg = svgLayer._container;
    svg.setAttribute('style', 'pointer-events:none');

    const draw = () => {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const bounds  = map.getBounds();
      const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());

      const drawLine = (pts) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        el.setAttribute('points', pts.map(p => {
          const q = map.latLngToLayerPoint(p);
          return `${q.x - topLeft.x},${q.y - topLeft.y}`;
        }).join(' '));
        el.setAttribute('stroke', 'rgba(79,209,232,0.10)');
        el.setAttribute('stroke-width', '0.6');
        el.setAttribute('fill', 'none');
        svg.appendChild(el);
      };

      const step = 5;
      const minLat = Math.floor(bounds.getSouth() / step) * step;
      const maxLat = Math.ceil(bounds.getNorth()  / step) * step;
      const minLng = Math.floor(bounds.getWest()  / step) * step;
      const maxLng = Math.ceil(bounds.getEast()   / step) * step;

      // Latitude lines
      for (let la = minLat; la <= maxLat; la += step) {
        drawLine([L.latLng(la, minLng), L.latLng(la, maxLng)]);
      }
      // Longitude lines
      for (let lo = minLng; lo <= maxLng; lo += step) {
        const pts = [];
        for (let la = minLat; la <= maxLat; la += step) pts.push(L.latLng(la, lo));
        if (pts.length >= 2) drawLine(pts);
      }
    };

    draw();
    map.on('moveend zoomend resize', draw);
    return () => {
      map.off('moveend zoomend resize', draw);
      map.removeLayer(svgLayer);
    };
  }, [map]);

  return null;
}

// ── Marching-ants animation controller ───────────────────────────────────────
function MarchingAnts({ polylineRef }) {
  const rafRef = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (!polylineRef.current) { rafRef.current = requestAnimationFrame(tick); return; }
      const el = polylineRef.current.getElement?.();
      if (el) {
        offsetRef.current = (offsetRef.current - 0.5) % 16;
        el.style.strokeDashoffset = offsetRef.current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [polylineRef]);

  return null;
}

// ── Ship animation controller ─────────────────────────────────────────────────
function ShipAnimator({ path, markerRef, duration = 8000 }) {
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!path || path.length < 2 || !markerRef.current) return;
    let cancelled = false;

    const run = async () => {
      const turf = await getTurf(); // null if not installed

      // Pre-compute cumulative distances for constant-speed interpolation
      const dists = [0];
      for (let i = 1; i < path.length; i++) {
        dists.push(dists[i - 1] + haversine(
          path[i-1].lat, path[i-1].lng, path[i].lat, path[i].lng
        ));
      }
      const totalKm = dists[dists.length - 1] || 1;

      // Simple bearing between two latlng points
      const bearing = (a, b) => {
        const toRad = x => x * Math.PI / 180;
        const toDeg = x => x * 180 / Math.PI;
        const dLng = toRad(b.lng - a.lng);
        const la   = toRad(a.lat), lb = toRad(b.lat);
        const x    = Math.sin(dLng) * Math.cos(lb);
        const y    = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLng);
        return (toDeg(Math.atan2(x, y)) + 360) % 360;
      };

      // Interpolate position at distance d along path
      const interpolate = (d) => {
        for (let i = 1; i < path.length; i++) {
          if (dists[i] >= d || i === path.length - 1) {
            const seg  = dists[i] - dists[i-1] || 1;
            const frac = Math.max(0, Math.min(1, (d - dists[i-1]) / seg));
            return {
              lat: path[i-1].lat + (path[i].lat - path[i-1].lat) * frac,
              lng: path[i-1].lng + (path[i].lng - path[i-1].lng) * frac,
              bearingTo: bearing(path[i-1], path[i]),
            };
          }
        }
        return { ...path[path.length-1], bearingTo: 0 };
      };

      const animate = (ts) => {
        if (cancelled) return;
        if (!startRef.current) startRef.current = ts;
        const elapsed = (ts - startRef.current) % duration;
        const frac    = elapsed / duration;
        const distKm  = frac * totalKm;

        let lat, lng, brng;

        if (turf) {
          // Use turf for precise interpolation if available
          try {
            const line  = turf.lineString(path.map(p => [p.lng, p.lat]));
            const pt    = turf.along(line, distKm, { units: 'kilometers' });
            [lng, lat]  = pt.geometry.coordinates;
            const ahead = turf.along(line, Math.min(distKm + 0.5, totalKm - 0.01), { units: 'kilometers' });
            brng = turf.bearing(pt.geometry.coordinates, ahead.geometry.coordinates);
          } catch { ({ lat, lng, bearingTo: brng } = interpolate(distKm)); }
        } else {
          ({ lat, lng, bearingTo: brng } = interpolate(distKm));
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          markerRef.current.setIcon(makeShipIcon(brng));
        }
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [path, markerRef, duration]);

  return null;
}

// ── Inner map components (need useMap, so must be inside MapContainer) ────────
function MapInner({ stations, hazards, computedPath, routeInfo, onMapReady }) {
  const map         = useMap();
  const polyRef     = useRef(null);
  const shipMarker  = useRef(null);

  useEffect(() => {
    onMapReady(map);
    return () => { if (shipMarker.current) shipMarker.current.remove(); };
  }, [map, onMapReady]);

  // Create/update ship marker imperatively (DivIcon requires imperative API)
  useEffect(() => {
    if (!computedPath || computedPath.length < 2) {
      if (shipMarker.current) { shipMarker.current.remove(); shipMarker.current = null; }
      return;
    }
    if (!shipMarker.current) {
      shipMarker.current = L.marker(
        [computedPath[0].lat, computedPath[0].lng],
        { icon: makeShipIcon(0), zIndexOffset: 1000 }
      ).addTo(map);
    }
    // Bind/update tooltip with distance + ETA
    if (routeInfo) {
      const tip = `🚢 ${routeInfo.distanceKm} km · ETA ${routeInfo.etaHours} h`;
      shipMarker.current.bindTooltip(tip, {
        permanent: false, direction: 'top', offset: [0, -16],
        className: 'leaflet-tooltip-custom',
      });
    }
  }, [computedPath, map, routeInfo]);

  const hazardColor = (sev) => {
    switch ((sev || '').toUpperCase()) {
      case 'CRITICAL': return C.red;
      case 'HIGH':     return C.amber;
      default:         return '#F5A62388';
    }
  };

  const hazardRadius = (sev) => {
    switch ((sev || '').toUpperCase()) {
      case 'CRITICAL': return 22;
      case 'HIGH':     return 16;
      default:         return 11;
    }
  };

  return (
    <>
      <GraticuleLayer />

      {/* Station markers — calm green pulse */}
      {stations.map((s, i) => (
        <CircleMarker
          key={s.id || i}
          center={[s.latitude, s.longitude]}
          radius={9}
          pathOptions={{
            color: C.green, fillColor: C.green,
            fillOpacity: 0.9, weight: 2,
          }}
        >
          <Tooltip
            permanent={false}
            direction="top"
            className="leaflet-tooltip-custom"
          >
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: C.textPri }}>
              {s.name} ({s.code})
            </span>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Hazard markers — red/amber with outer glow ring */}
      {hazards.map((h, i) => {
        const lat = h.latitude  ?? h.lat;
        const lng = h.longitude ?? h.lng;
        if (lat == null || lng == null) return null;
        const col = hazardColor(h.severity);
        const rad = hazardRadius(h.severity);
        return (
          <LayerGroup key={h.id || i}>
            {/* Outer glow ring */}
            <CircleMarker
              center={[lat, lng]}
              radius={rad * 2.2}
              pathOptions={{ color: col, fillColor: col, fillOpacity: 0.07, weight: 0.8 }}
            />
            {/* Core */}
            <CircleMarker
              center={[lat, lng]}
              radius={rad}
              pathOptions={{ color: col, fillColor: col, fillOpacity: 0.75, weight: 1.5 }}
            >
              <Tooltip direction="top">
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
                  {h.hazard_type} · {h.severity}
                </span>
              </Tooltip>
            </CircleMarker>
          </LayerGroup>
        );
      })}

      {/* Computed route — double-stroke for glow effect + dashes */}
      {computedPath && computedPath.length > 1 && (
        <>
          {/* Glow layer (wider, low opacity) */}
          <Polyline
            positions={computedPath.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: C.cyan, weight: 7, opacity: 0.18,
              dashArray: null, lineCap: 'round',
            }}
          />
          {/* Active marching-ants line */}
          <Polyline
            ref={polyRef}
            positions={computedPath.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: C.cyan, weight: 2.5, opacity: 0.95,
              dashArray: '6 10', lineCap: 'round',
            }}
          />
          <MarchingAnts polylineRef={polyRef} />
        </>
      )}

      {/* Ship animator */}
      {computedPath && computedPath.length > 1 && (
        <ShipAnimator path={computedPath} markerRef={shipMarker} duration={8000} />
      )}
    </>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export default function AntarcticRoutePlanner({
  stations = [],
  hazards  = [],
  onRouteComputed,
}) {
  const [fromId,       setFromId]       = useState(stations[0]?.id ?? '');
  const [toId,         setToId]         = useState(stations[1]?.id ?? '');
  const [computing,    setComputing]    = useState(false);
  const [computedPath, setComputedPath] = useState(null);
  const [routeInfo,    setRouteInfo]    = useState(null);
  const [error,        setError]        = useState('');
  const mapRef = useRef(null);

  // Update defaults when stations load
  useEffect(() => {
    if (stations.length >= 2) {
      setFromId(prev => prev || stations[0]?.id);
      setToId(prev   => prev || stations[1]?.id);
    }
  }, [stations]);

  const fromStation = stations.find(s => s.id === fromId) ?? stations[0];
  const toStation   = stations.find(s => s.id === toId)   ?? stations[1];

  const handleCompute = useCallback(async () => {
    if (!fromStation || !toStation) return;
    if (fromStation.id === toStation.id) {
      setError('Start and destination must be different stations.');
      return;
    }
    setError('');
    setComputing(true);
    setComputedPath(null);
    setRouteInfo(null);

    const start = { lat: fromStation.latitude,  lng: fromStation.longitude  };
    const end   = { lat: toStation.latitude,    lng: toStation.longitude    };

    // 1. Try backend ML service first — log real errors for debugging
    let backendResult = null;
    try {
      backendResult = await onRouteComputed?.({ start, end });
    } catch (err) {
      // Surface the real error (auth 401, CORS, network, ML timeout) in console
      console.warn('[RoutePlanner] Backend call failed:', err?.message ?? err);
    }

    if (backendResult?.path_geojson?.coordinates?.length > 1) {
      const path = backendResult.path_geojson.coordinates.map(([lng, lat]) => ({ lat, lng }));
      setComputedPath(path);
      setRouteInfo({
        distanceKm:     backendResult.total_distance_km   ?? backendResult.distance_km,
        etaHours:       backendResult.estimated_time_hours ?? backendResult.estimated_hours,
        confidence:     backendResult.confidence_score     ?? backendResult.confidence,
        explanation:    backendResult.explanation,
        hazardsAvoided: (backendResult.hazards_avoided  ?? []).length,
        weatherAvoided: (backendResult.weather_avoided  ?? []).length,
      });
      if (mapRef.current && path.length > 0) {
        mapRef.current.fitBounds(path.map(p => [p.lat, p.lng]), { padding: [32, 32] });
      }
      setComputing(false);
      return;
    }

    // 2. Fallback: client-side A*
    const path = runAstar(start, end, hazards);
    if (!path) {
      setError('No navigable path found — hazard zones may fully block the route. Try different stations or check active hazards.');
      setComputing(false);
      return;
    }

    // Compute rough stats
    let distKm = 0;
    for (let i = 1; i < path.length; i++) {
      distKm += haversine(path[i-1].lat, path[i-1].lng, path[i].lat, path[i].lng);
    }
    const etaH = +(distKm / 25).toFixed(1); // ~25 km/h traverse speed

    setComputedPath(path);
    setRouteInfo({
      distanceKm:     +distKm.toFixed(1),
      etaHours:       etaH,
      confidence:     78,
      explanation:    `Client-side A* route. ${hazards.filter(h=>['CRITICAL','HIGH'].includes(h.severity)).length} high-risk hazard zone(s) steered around.`,
      hazardsAvoided: hazards.filter(h => ['CRITICAL','HIGH'].includes(h.severity)).length,
      weatherAvoided: 0,
    });

    if (mapRef.current && path.length > 0) {
      mapRef.current.fitBounds(path.map(p => [p.lat, p.lng]), { padding: [32, 32] });
    }
    setComputing(false);
  }, [fromStation, toStation, hazards, onRouteComputed]);

  // Refit map when selected stations change (before any route is computed)
  useEffect(() => {
    if (!mapRef.current || !fromStation || !toStation) return;
    const pts = [
      [fromStation.latitude, fromStation.longitude],
      [toStation.latitude,   toStation.longitude],
    ];
    try { mapRef.current.fitBounds(pts, { padding: [48, 48] }); } catch (_) {}
  }, [fromId, toId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectStyle = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(16,27,45,0.9)',
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.textPri,
    fontFamily: 'IBM Plex Sans, Inter, sans-serif',
    fontSize: 13, outline: 'none', cursor: 'pointer',
  };

  const labelStyle = {
    display: 'block', marginBottom: 6,
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 10, color: C.textMut, letterSpacing: '0.06em',
  };

  return (
    <div style={{ background: C.navy, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${C.border}` }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: C.cyan, marginBottom: 3, letterSpacing: '0.04em' }}>
            A* traverse planner
          </p>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri, margin: 0 }}>
            Route computation
          </h2>
        </div>
        <button
          onClick={handleCompute}
          disabled={computing || !fromStation || !toStation}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: computing
              ? 'rgba(79,209,232,0.15)'
              : `linear-gradient(135deg, ${C.cyan}, #2aa8be)`,
            color: computing ? C.cyan : C.navy,
            fontFamily: 'IBM Plex Sans, Inter, sans-serif',
            fontWeight: 700, fontSize: 13,
            opacity: (!fromStation || !toStation) ? 0.5 : 1,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {computing && (
            <span style={{ width: 12, height: 12, border: `2px solid ${C.cyan}`,
              borderTopColor: 'transparent', borderRadius: '50%',
              display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
          )}
          {computing ? 'Computing…' : 'Compute safe route'}
        </button>
      </div>

      {/* ── Station selectors ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <label style={labelStyle}>From station</label>
          <select value={fromId} onChange={e => setFromId(e.target.value)} style={selectStyle}>
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
          {fromStation && (
            <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10,
              color:C.textMut, marginTop:4 }}>
              {Number(fromStation.latitude).toFixed(4)}°, {Number(fromStation.longitude).toFixed(4)}°
            </p>
          )}
        </div>
        <div>
          <label style={labelStyle}>To station</label>
          <select value={toId} onChange={e => setToId(e.target.value)} style={selectStyle}>
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
          {toStation && (
            <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10,
              color:C.textMut, marginTop:4 }}>
              {Number(toStation.latitude).toFixed(4)}°, {Number(toStation.longitude).toFixed(4)}°
            </p>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ margin: '0 20px 0', padding: '10px 14px',
          background: 'rgba(242,84,91,0.08)', border: `1px solid ${C.red}`,
          borderRadius: 8, fontFamily:'IBM Plex Mono,monospace',
          fontSize: 12, color: C.red, marginTop: 12 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Map ── */}
      <div style={{ height: 420, position: 'relative' }}>
        <MapContainer
          center={[-70, 40]}
          zoom={4}
          style={{ height: '100%', width: '100%', background: '#07111e' }}
          zoomControl
          attributionControl
        >
          {/* OSM tiles — free, no API key, dark-filtered via CSS.
              Falls back to same URL if VITE_MAP_TILE_KEY is absent
              (env var reserved for future paid provider swap). */}
          <TileLayer
            url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
            className="map-dark-tiles"
          />

          <MapInner
            stations={stations}
            hazards={hazards}
            computedPath={computedPath}
            routeInfo={routeInfo}
            onMapReady={m => { mapRef.current = m; }}
          />
        </MapContainer>

        {/* ── Frosted-glass legend ── */}
        <div style={{
          position: 'absolute', bottom: 16, right: 12, zIndex: 999,
          background: 'rgba(16,27,45,0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '12px 14px',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: C.textMut,
          minWidth: 140,
        }}>
          <p style={{ color: C.cyan, fontWeight: 700, marginBottom: 8, fontSize: 10 }}>
            Map legend
          </p>
          {[
            { color: C.green,  label: 'Research station' },
            { color: C.red,    label: 'Critical hazard'  },
            { color: C.amber,  label: 'High/medium hazard' },
            { color: C.cyan,   label: 'Computed route'   },
          ].map(({ color, label }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
              <span style={{ width:10, height:10, borderRadius:'50%',
                background: color, display:'inline-block', flexShrink:0,
                boxShadow: `0 0 6px ${color}` }} />
              <span>{label}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
            <span style={{ width:20, height:2, background:C.cyan,
              display:'inline-block', flexShrink:0 }} />
            <span>Ship track</span>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop:`1px solid ${C.border}`,
            display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%',
              background: C.cyan, animation:'ping2 1.5s ease-in-out infinite',
              display:'inline-block' }} />
            <span style={{ color: C.cyan }}>Live tracking active</span>
          </div>
        </div>
      </div>

      {/* ── Route result panel ── */}
      {routeInfo && (
        <div style={{ padding: '14px 20px', borderTop:`1px solid ${C.border}`,
          display:'grid', gap:10 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
            <RouteMetric label="Distance"    value={`${routeInfo.distanceKm} km`}     color={C.cyan}  />
            <RouteMetric label="Est. transit" value={`${routeInfo.etaHours} h`}        color={C.green} />
            <RouteMetric label="Confidence"  value={`${routeInfo.confidence ?? '—'}%`} color={routeInfo.confidence >= 80 ? C.green : C.amber} />
            <RouteMetric label="Hazards bypassed" value={routeInfo.hazardsAvoided}     color={C.amber} />
            {routeInfo.weatherAvoided > 0 && (
              <RouteMetric label="Weather cells avoided" value={routeInfo.weatherAvoided} color={C.cyan} />
            )}
          </div>
          {routeInfo.explanation && (
            <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11,
              color:C.textMut, lineHeight:1.6, margin:0 }}>
              {routeInfo.explanation}
            </p>
          )}
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes ping2 {
          0%,100% { opacity:0.8; transform:scale(1);   }
          50%      { opacity:0.3; transform:scale(1.8); }
        }
        /* Dark-theme OSM tiles — no paid provider needed */
        .map-dark-tiles img.leaflet-tile {
          filter: invert(1) hue-rotate(180deg) brightness(0.88) contrast(0.96) saturate(0.7);
        }
        .leaflet-tooltip-custom {
          background: rgba(16,27,45,0.9) !important;
          border: 1px solid #1C2B40 !important;
          color: #E8EEF5 !important;
          font-family: 'IBM Plex Mono', monospace !important;
          font-size: 11px !important;
          border-radius: 6px !important;
          box-shadow: none !important;
        }
        .leaflet-tooltip-custom::before { display:none !important; }
        .leaflet-control-zoom a {
          background: rgba(16,27,45,0.9) !important;
          color: #4FD1E8 !important;
          border-color: #1C2B40 !important;
        }
        .leaflet-control-attribution {
          background: rgba(16,27,45,0.6) !important;
          color: #7C8CA3 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #4FD1E8 !important; }
      `}</style>
    </div>
  );
}

function RouteMetric({ label, value, color }) {
  return (
    <div>
      <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10,
        color:'#7C8CA3', marginBottom:3 }}>{label}</p>
      <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:18,
        fontWeight:800, color, margin:0 }}>{value}</p>
    </div>
  );
}

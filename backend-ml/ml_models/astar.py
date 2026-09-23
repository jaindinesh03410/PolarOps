"""
Real A* pathfinding over a geographic grid with hazard costs.
Heuristic: haversine distance (admissible on the sphere for local Antarctic ops).
"""
from __future__ import annotations

import heapq
import math
from typing import Any, Dict, List, Optional, Set, Tuple


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km."""
    r_km = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return r_km * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _hazard_lat_lng(hazard: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    lat = hazard.get("lat", hazard.get("latitude"))
    lng = hazard.get("lng", hazard.get("longitude"))
    if lat is None or lng is None:
        return None
    return float(lat), float(lng)


def _hazard_radius_km(hazard: Dict[str, Any]) -> float:
    severity = str(hazard.get("severity", "MEDIUM")).upper()
    if severity == "CRITICAL":
        return 5.0
    if severity == "HIGH":
        return 3.0
    if severity == "MEDIUM":
        return 2.0
    return 1.0


def _is_blocked_severity(severity: str) -> bool:
    return str(severity).upper() in {"CRITICAL", "HIGH"}


def _adaptive_resolution(start: Dict[str, float], end: Dict[str, float], target_cells: int = 48) -> Tuple[float, float, float, float, float, float]:
    """Choose lat/lng step so the longer axis has ~target_cells (caps search size)."""
    pad = 0.35
    min_lat = min(start["lat"], end["lat"]) - pad
    max_lat = max(start["lat"], end["lat"]) + pad
    min_lng = min(start["lng"], end["lng"]) - pad
    max_lng = max(start["lng"], end["lng"]) + pad
    span_lat = max(max_lat - min_lat, 1e-4)
    span_lng = max(max_lng - min_lng, 1e-4)
    step = max(span_lat, span_lng) / target_cells
    step = max(step, 0.01)
    return min_lat, max_lat, min_lng, max_lng, step, step


def astar_pathfind(
    start: Dict[str, float],
    end: Dict[str, float],
    hazards: List[Dict[str, Any]],
    weather_cells: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    A* on an 8-connected lat/lng grid.
    CRITICAL/HIGH hazards are blocked cells; MEDIUM/LOW are high-cost.
    weather_cells (same shape as hazards, with a 'severity' field derived from
    wind/visibility) are added to the EXISTING high_cost set — no separate cost
    pathway — so behaviour stays consistent and explainable.
    If the blocked map has no path, retry with high-cost (never blocked) so a
    route still exists.
    """
    hazards = hazards or []
    weather_cells = weather_cells or []
    result = _search(start, end, hazards, allow_blocked=True, weather_cells=weather_cells)
    if result is None:
        result = _search(start, end, hazards, allow_blocked=False, weather_cells=weather_cells)
    if result is None:
        raise ValueError("No navigable path found between start and end")
    return result


def _search(
    start: Dict[str, float],
    end: Dict[str, float],
    hazards: List[Dict[str, Any]],
    allow_blocked: bool,
    weather_cells: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    min_lat, max_lat, min_lng, max_lng, step_lat, step_lng = _adaptive_resolution(start, end)

    def to_cell(lat: float, lng: float) -> Tuple[int, int]:
        i = int(round((lat - min_lat) / step_lat))
        j = int(round((lng - min_lng) / step_lng))
        return i, j

    def to_geo(i: int, j: int) -> Tuple[float, float]:
        return min_lat + i * step_lat, min_lng + j * step_lng

    n_i = int(round((max_lat - min_lat) / step_lat))
    n_j = int(round((max_lng - min_lng) / step_lng))

    start_cell = to_cell(start["lat"], start["lng"])
    end_cell = to_cell(end["lat"], end["lng"])
    start_cell = (max(0, min(n_i, start_cell[0])), max(0, min(n_j, start_cell[1])))
    end_cell = (max(0, min(n_i, end_cell[0])), max(0, min(n_j, end_cell[1])))

    blocked: Set[Tuple[int, int]] = set()
    high_cost: Set[Tuple[int, int]] = set()
    hazards_in_corridor: List[Dict[str, Any]] = []

    for hazard in hazards:
        coords = _hazard_lat_lng(hazard)
        if coords is None:
            continue
        h_lat, h_lng = coords
        radius = _hazard_radius_km(hazard)
        severity = str(hazard.get("severity", "MEDIUM")).upper()
        recorded = False
        for i in range(n_i + 1):
            for j in range(n_j + 1):
                lat, lng = to_geo(i, j)
                if haversine_distance(lat, lng, h_lat, h_lng) < radius:
                    cell = (i, j)
                    if cell in (start_cell, end_cell):
                        continue
                    if allow_blocked and _is_blocked_severity(severity):
                        blocked.add(cell)
                    else:
                        high_cost.add(cell)
                    if not recorded:
                        hazards_in_corridor.append({
                            "type": hazard.get("type", hazard.get("hazard_type", "UNKNOWN")),
                            "severity": severity,
                            "lat": h_lat,
                            "lng": h_lng,
                        })
                        recorded = True

    # ── Weather cells: same high_cost mechanism, no separate cost pathway ──────
    # HIGH/CRITICAL weather cells get added to high_cost (step_cost *= 8.0) so
    # the router steers around storm corridors the same way it steers around
    # hazards. weather_avoided is returned so callers can explain the detour.
    weather_in_corridor: List[Dict[str, Any]] = []
    for wcell in (weather_cells or []):
        coords = _hazard_lat_lng(wcell)
        if coords is None:
            continue
        w_lat, w_lng = coords
        severity = str(wcell.get("severity", "LOW")).upper()
        # Only HIGH/CRITICAL weather meaningfully reroutes; LOW/MEDIUM are noted
        # but don't inflate cost (they're fine-weather corridors).
        if severity not in ("HIGH", "CRITICAL"):
            continue
        radius = _hazard_radius_km(wcell)  # reuse same radius logic (severity-driven)
        recorded = False
        for i in range(n_i + 1):
            for j in range(n_j + 1):
                lat, lng = to_geo(i, j)
                if haversine_distance(lat, lng, w_lat, w_lng) < radius:
                    cell = (i, j)
                    if cell in (start_cell, end_cell):
                        continue
                    # Always high-cost (never hard-blocked) — weather degrades a
                    # route but should never make it entirely unnavigable.
                    high_cost.add(cell)
                    if not recorded:
                        weather_in_corridor.append({
                            "type": wcell.get("type", "WEATHER"),
                            "severity": severity,
                            "lat": w_lat,
                            "lng": w_lng,
                            "condition": wcell.get("condition", ""),
                        })
                        recorded = True

    neighbors = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]

    def heuristic(cell: Tuple[int, int]) -> float:
        lat, lng = to_geo(*cell)
        elat, elng = to_geo(*end_cell)
        return haversine_distance(lat, lng, elat, elng)

    open_heap: List[Tuple[float, int, Tuple[int, int]]] = []
    counter = 0
    g_score = {start_cell: 0.0}
    parent: Dict[Tuple[int, int], Tuple[int, int]] = {}
    heapq.heappush(open_heap, (heuristic(start_cell), counter, start_cell))
    closed: Set[Tuple[int, int]] = set()
    nodes_explored = 0

    while open_heap:
        _, _, current = heapq.heappop(open_heap)
        if current in closed:
            continue
        closed.add(current)
        nodes_explored += 1

        if current == end_cell:
            cells = [current]
            while cells[-1] in parent:
                cells.append(parent[cells[-1]])
            cells.reverse()
            path = []
            for idx, cell in enumerate(cells):
                lat, lng = to_geo(*cell)
                # Snap first/last to requested coordinates
                if idx == 0:
                    lat, lng = start["lat"], start["lng"]
                elif idx == len(cells) - 1:
                    lat, lng = end["lat"], end["lng"]
                path.append({"lat": lat, "lng": lng})

            total_distance = 0.0
            for a, b in zip(path, path[1:]):
                total_distance += haversine_distance(a["lat"], a["lng"], b["lat"], b["lng"])

            straight = haversine_distance(start["lat"], start["lng"], end["lat"], end["lng"])
            detour_ratio = (total_distance / straight) if straight > 0.01 else 1.0
            # Confidence from search quality: path found, limited detour, hazards considered
            confidence = 92.0 / max(1.0, detour_ratio)
            if hazards_in_corridor:
                confidence = min(96.0, confidence + 3.0)
            if not allow_blocked:
                confidence = max(60.0, confidence - 8.0)
            confidence = round(max(55.0, min(97.0, confidence)), 1)

            return {
                "waypoints": [{"lat": p["lat"], "lng": p["lng"], "sequence": i} for i, p in enumerate(path)],
                "path_geojson": {
                    "type": "LineString",
                    "coordinates": [[p["lng"], p["lat"]] for p in path],
                },
                "distance_km": round(total_distance, 2),
                "estimated_hours": round(total_distance / 5, 1),
                "hazards_avoided": hazards_in_corridor,
                "weather_avoided": weather_in_corridor,
                "nodes_explored": nodes_explored,
                "grid": {
                    "cells_lat": n_i + 1,
                    "cells_lng": n_j + 1,
                    "step_deg": round(step_lat, 4),
                    "blocked_cells": len(blocked),
                    "high_cost_cells": len(high_cost),
                    "blocked_enforced": allow_blocked,
                },
                "algorithm": "A* (8-connected grid, haversine heuristic)",
                "confidence": confidence,
            }

        ci, cj = current
        clat, clng = to_geo(ci, cj)
        for di, dj in neighbors:
            ni, nj = ci + di, cj + dj
            neighbor = (ni, nj)
            if ni < 0 or nj < 0 or ni > n_i or nj > n_j:
                continue
            if neighbor in blocked or neighbor in closed:
                continue
            nlat, nlng = to_geo(ni, nj)
            step_cost = haversine_distance(clat, clng, nlat, nlng)
            if neighbor in high_cost:
                step_cost *= 8.0
            tentative = g_score[current] + step_cost
            if tentative < g_score.get(neighbor, float("inf")):
                parent[neighbor] = current
                g_score[neighbor] = tentative
                f = tentative + heuristic(neighbor)
                counter += 1
                heapq.heappush(open_heap, (f, counter, neighbor))

    return None

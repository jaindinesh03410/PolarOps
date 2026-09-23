/**
 * weatherService.js
 * Fetches real live weather data from Open-Meteo (free, no API key required)
 * and upserts into the weather_snapshots Supabase table.
 *
 * Open-Meteo docs: https://open-meteo.com/en/docs
 * Endpoint used:
 *   https://api.open-meteo.com/v1/forecast
 *     ?latitude=<lat>&longitude=<lng>
 *     &current=temperature_2m,wind_speed_10m,wind_gusts_10m,visibility
 *     &wind_speed_unit=kmh
 *     &forecast_days=2
 */

import axios from 'axios';
import { supabase } from '../config/supabase.js';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_TIMEOUT_MS = 8000;

// ── Severity thresholds ─────────────────────────────────────────────────────
// wind_speed_kmh > 60  OR visibility_km < 1  → CRITICAL
// wind_speed_kmh > 40  OR visibility_km < 3  → HIGH
// wind_speed_kmh > 25                        → MEDIUM
// otherwise                                  → LOW
function computeSeverity(windSpeedKmh, visibilityKm) {
  const wind = windSpeedKmh ?? 0;
  const vis  = visibilityKm ?? 99; // treat unknown visibility as clear

  if (wind > 60 || vis < 1)  return 'CRITICAL';
  if (wind > 40 || vis < 3)  return 'HIGH';
  if (wind > 25)              return 'MEDIUM';
  return 'LOW';
}

// ── Map WMO weather code to a human-readable condition string ───────────────
// https://open-meteo.com/en/docs#weathervariables (WMO Weather interpretation codes)
function wmoCodeToCondition(code) {
  if (code === undefined || code === null) return 'Unknown';
  if (code === 0)              return 'Clear sky';
  if (code <= 3)               return 'Partly cloudy';
  if (code <= 9)               return 'Fog / depositing rime';
  if (code <= 19)              return 'Drizzle';
  if (code <= 29)              return 'Rain';
  if (code <= 39)              return 'Snow';
  if (code <= 49)              return 'Fog';
  if (code <= 59)              return 'Drizzle';
  if (code <= 69)              return 'Rain';
  if (code <= 79)              return 'Snow grains';
  if (code <= 84)              return 'Rain showers';
  if (code <= 94)              return 'Snow showers';
  if (code <= 99)              return 'Thunderstorm';
  return 'Unknown';
}

/**
 * Fetch current weather for a single station from Open-Meteo.
 * Returns a weather_snapshots row-shaped object, or throws on network/API error.
 *
 * @param {{ id: string, name: string, latitude: number, longitude: number }} station
 * @returns {Promise<object>} Row ready for weather_snapshots insert
 */
export async function fetchStationWeather(station) {
  const { id: station_id, latitude, longitude } = station;

  const params = new URLSearchParams({
    latitude:       String(latitude),
    longitude:      String(longitude),
    current:        'temperature_2m,wind_speed_10m,wind_gusts_10m,visibility,weather_code',
    wind_speed_unit: 'kmh',
    forecast_days:  '2',
  });

  const url = `${OPEN_METEO_BASE}?${params.toString()}`;

  const response = await axios.get(url, { timeout: OPEN_METEO_TIMEOUT_MS });
  const current  = response.data?.current;

  if (!current) {
    throw new Error(`Open-Meteo returned no current data for station ${station_id}`);
  }

  const wind_speed_kmh = current.wind_speed_10m   ?? null;
  const wind_gust_kmh  = current.wind_gusts_10m   ?? null;
  // Open-Meteo returns visibility in metres; convert to km
  const visibility_km  = current.visibility != null
    ? Math.round((current.visibility / 1000) * 1000) / 1000
    : null;
  const temperature_c  = current.temperature_2m   ?? null;
  const condition      = wmoCodeToCondition(current.weather_code);
  const severity       = computeSeverity(wind_speed_kmh, visibility_km);

  return {
    station_id,
    latitude:       Number(latitude),
    longitude:      Number(longitude),
    wind_speed_kmh,
    wind_gust_kmh,
    visibility_km,
    temperature_c,
    condition,
    severity,
    source:         'open-meteo',
    fetched_at:     new Date().toISOString(),
  };
}

/**
 * Refresh weather for ALL active/isolated stations and upsert into weather_snapshots.
 * Each station is processed independently so one API failure doesn't block others.
 * Designed to be called by cronService.js every 3 hours.
 */
export async function refreshAllStationWeather() {
  console.log('🌦️  [weatherService] Starting weather refresh for all stations…');

  // Fetch only stations that are operationally relevant
  const { data: stations, error: stationsError } = await supabase
    .from('stations')
    .select('id, name, latitude, longitude')
    .in('status', ['ACTIVE', 'ISOLATED', 'EMERGENCY']);

  if (stationsError) {
    console.error('🌦️  [weatherService] Failed to fetch stations list:', stationsError.message);
    return; // Can't proceed without station list; cron will retry next cycle
  }

  if (!stations || stations.length === 0) {
    console.log('🌦️  [weatherService] No active stations found — skipping refresh.');
    return;
  }

  let successCount = 0;
  let failCount    = 0;

  for (const station of stations) {
    try {
      const snapshot = await fetchStationWeather(station);

      const { error: upsertError } = await supabase
        .from('weather_snapshots')
        .insert(snapshot); // always insert a fresh timestamped row (no dedup needed)

      if (upsertError) {
        throw new Error(`Supabase insert failed: ${upsertError.message}`);
      }

      console.log(
        `🌦️  [weatherService] ✅ ${station.name}: ` +
        `${snapshot.wind_speed_kmh ?? '?'} km/h wind, ` +
        `${snapshot.visibility_km ?? '?'} km vis, ` +
        `severity=${snapshot.severity}`
      );
      successCount++;
    } catch (err) {
      // Intentionally per-station: log and continue
      console.error(`🌦️  [weatherService] ❌ ${station.name} (${station.id}): ${err.message}`);
      failCount++;
    }
  }

  console.log(
    `🌦️  [weatherService] Refresh complete — ` +
    `${successCount} updated, ${failCount} failed out of ${stations.length} stations.`
  );
}

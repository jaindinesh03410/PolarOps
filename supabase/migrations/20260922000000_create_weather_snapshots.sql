-- Migration: create weather_snapshots table
-- Stores real Open-Meteo weather readings per station, refreshed every 3 hours.
-- Severity thresholds (wind in km/h, visibility in km):
--   CRITICAL : wind_speed > 60  OR visibility < 1
--   HIGH     : wind_speed > 40  OR visibility < 3
--   MEDIUM   : wind_speed > 25
--   LOW      : everything else

CREATE TABLE IF NOT EXISTS weather_snapshots (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id     UUID        NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    latitude       DECIMAL(10, 8) NOT NULL,
    longitude      DECIMAL(11, 8) NOT NULL,
    wind_speed_kmh NUMERIC(6, 2),
    wind_gust_kmh  NUMERIC(6, 2),
    visibility_km  NUMERIC(8, 3),
    temperature_c  NUMERIC(5, 2),
    condition      TEXT,
    severity       TEXT        NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    source         TEXT        NOT NULL DEFAULT 'open-meteo',
    fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast "most recent per station" queries used by route planner & correlation engine
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_station_fetched
    ON weather_snapshots (station_id, fetched_at DESC);

-- Index for "all HIGH/CRITICAL in last N hours" queries
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_severity_fetched
    ON weather_snapshots (severity, fetched_at DESC);

-- Row-level security: allow service role full access, authenticated users read-only
ALTER TABLE weather_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_snapshots_read" ON weather_snapshots
    FOR SELECT USING (true);

CREATE POLICY "weather_snapshots_service_write" ON weather_snapshots
    FOR ALL USING (auth.role() = 'service_role');

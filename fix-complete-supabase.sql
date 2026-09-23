-- COMPLETE SUPABASE FIX FOR DEMO MODE
-- Run this in Supabase SQL Editor

-- Step 1: Disable ALL RLS policies
ALTER TABLE stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE personnel DISABLE ROW LEVEL SECURITY;
ALTER TABLE roster_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_forecasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_manifests DISABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_optimizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE hazards DISABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear existing data (optional - only if you want fresh start)
-- TRUNCATE TABLE personnel, stations, inventory_items, wellness_checkins, alerts, hazards, sos_events, cargo_manifests CASCADE;

-- Step 3: Insert complete seed data
INSERT INTO stations (id, name, code, latitude, longitude, location, status, capacity, current_occupancy, established_date) VALUES
('a0000000-0000-0000-0000-000000000001', 'Maitri Station', 'MAITRI', -70.7666, 11.7333, ST_SetSRID(ST_MakePoint(11.7333, -70.7666), 4326), 'ISOLATED', 25, 18, '1989-01-01'),
('a0000000-0000-0000-0000-000000000002', 'Bharati Station', 'BHARATI', -69.4083, 76.1833, ST_SetSRID(ST_MakePoint(76.1833, -69.4083), 4326), 'ACTIVE', 47, 32, '2012-03-18'),
('a0000000-0000-0000-0000-000000000003', 'Dakshin Gangotri', 'DGANGOTRI', -70.0500, 12.0000, ST_SetSRID(ST_MakePoint(12.0000, -70.0500), 4326), 'ACTIVE', 5, 2, '1984-01-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO personnel (id, full_name, role, email, station_id, specialization, is_active, arrival_date) VALUES
('b0000000-0000-0000-0000-000000000001', 'Dr. Rajesh Kumar', 'HQ_ADMIN', 'rajesh.kumar@ncaor.gov.in', NULL, 'Antarctic Program Director', true, NULL),
('b0000000-0000-0000-0000-000000000002', 'Cdr. Anil Sharma', 'STATION_COMMANDER', 'anil.sharma@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Station Management', true, '2024-11-15'),
('b0000000-0000-0000-0000-000000000003', 'Dr. Priya Singh', 'MEDICAL_OFFICER', 'priya.singh@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Emergency Medicine', true, '2024-11-15'),
('b0000000-0000-0000-0000-000000000004', 'Lt. Vikram Patel', 'LOGISTICS_OFFICER', 'vikram.patel@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Supply Chain & Routing', true, '2024-11-15'),
('b0000000-0000-0000-0000-000000000005', 'Ramesh Gupta', 'FIELD_CREW', 'ramesh.gupta@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Glaciology', true, '2024-11-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_items (id, station_id, item_name, category, unit, current_quantity, minimum_threshold, daily_consumption_rate, last_resupply_date, data_source, confidence_score) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Diesel Fuel', 'FUEL', 'liters', 2800, 1000, 45, '2024-11-01', 'MEASURED', 98.5),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Medical Antibiotics', 'MEDICAL', 'units', 85, 50, 1.2, '2024-11-01', 'MEASURED', 95.0),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Dried Food Rations', 'FOOD', 'kg', 420, 200, 8.5, '2024-11-01', 'MEASURED', 99.2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wellness_checkins (personnel_id, station_id, checkin_date, mood_score, fatigue_level, stress_level, sleep_hours, data_source) VALUES
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2024-12-10', 7, 4, 3, 7.5, 'MANUAL_ENTRY'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2024-12-18', 4, 8, 7, 5.1, 'MANUAL_ENTRY'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '2024-12-18', 8, 3, 2, 7.8, 'MANUAL_ENTRY')
ON CONFLICT DO NOTHING;

INSERT INTO hazards (id, hazard_type, latitude, longitude, location, severity, detection_method, detection_confidence, status, data_source, confidence_score, metadata) VALUES
('d0000000-0000-0000-0000-000000000001', 'CREVASSE', -70.7500, 11.7500, ST_SetSRID(ST_MakePoint(11.7500, -70.7500), 4326), 'HIGH', 'YOLOV8', 92.3, 'ACTIVE', 'MEASURED', 92.3, '{"detection_date": "2024-12-15"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (alert_type, severity, title, message, station_id, data_source, confidence_score) VALUES
('INVENTORY_LOW', 'HIGH', 'Fuel Approaching Minimum', 'Diesel fuel at Maitri predicted to reach minimum in 18 days', 'a0000000-0000-0000-0000-000000000001', 'SIMULATED', 87.5)
ON CONFLICT DO NOTHING;

-- Step 4: Verify data
SELECT 'Stations:', count(*) FROM stations;
SELECT 'Personnel:', count(*) FROM personnel;
SELECT 'Inventory:', count(*) FROM inventory_items;
SELECT 'Wellness:', count(*) FROM wellness_checkins;
SELECT 'Alerts:', count(*) FROM alerts;

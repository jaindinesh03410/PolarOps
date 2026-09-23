-- Seed Data for Demo Scenarios
-- Antarctic Research Station Management System

-- Insert Stations
INSERT INTO stations (id, name, code, latitude, longitude, location, status, capacity, current_occupancy, established_date) VALUES
('a0000000-0000-0000-0000-000000000001', 'Maitri Station', 'MAITRI', -70.7666, 11.7333, ST_SetSRID(ST_MakePoint(11.7333, -70.7666), 4326), 'ISOLATED', 25, 18, '1989-01-01'),
('a0000000-0000-0000-0000-000000000002', 'Bharati Station', 'BHARATI', -69.4083, 76.1833, ST_SetSRID(ST_MakePoint(76.1833, -69.4083), 4326), 'ACTIVE', 47, 32, '2012-03-18'),
('a0000000-0000-0000-0000-000000000003', 'Dakshin Gangotri (Supply Depot)', 'DGANGOTRI', -70.0500, 12.0000, ST_SetSRID(ST_MakePoint(12.0000, -70.0500), 4326), 'ACTIVE', 5, 2, '1984-01-01');

-- Note: Auth users need to be created through Supabase Auth API first
-- This seed assumes test users will be created separately
-- For demo purposes, we'll create placeholder personnel records

INSERT INTO personnel (id, full_name, role, email, station_id, specialization, is_active, arrival_date) VALUES
-- HQ Admin (Goa)
('b0000000-0000-0000-0000-000000000001', 'Dr. Rajesh Kumar', 'HQ_ADMIN', 'rajesh.kumar@ncaor.gov.in', NULL, 'Antarctic Program Director', true, NULL),

-- Maitri Station
('b0000000-0000-0000-0000-000000000002', 'Cdr. Anil Sharma', 'STATION_COMMANDER', 'anil.sharma@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Station Management', true, '2024-11-15'),
('b0000000-0000-0000-0000-000000000003', 'Dr. Priya Singh', 'MEDICAL_OFFICER', 'priya.singh@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Emergency Medicine', true, '2024-11-15'),
('b0000000-0000-0000-0000-000000000004', 'Lt. Vikram Patel', 'LOGISTICS_OFFICER', 'vikram.patel@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Supply Chain & Routing', true, '2024-11-15'),
('b0000000-0000-0000-0000-000000000005', 'Ramesh Gupta', 'FIELD_CREW', 'ramesh.gupta@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Glaciology', true, '2024-11-20'),
('b0000000-0000-0000-0000-000000000006', 'Sunita Verma', 'FIELD_CREW', 'sunita.verma@maitri.ant', 'a0000000-0000-0000-0000-000000000001', 'Meteorology', true, '2024-11-20'),

-- Bharati Station
('b0000000-0000-0000-0000-000000000007', 'Cdr. Suresh Reddy', 'STATION_COMMANDER', 'suresh.reddy@bharati.ant', 'a0000000-0000-0000-0000-000000000002', 'Station Management', true, '2024-11-10'),
('b0000000-0000-0000-0000-000000000008', 'Arjun Mehta', 'FIELD_CREW', 'arjun.mehta@bharati.ant', 'a0000000-0000-0000-0000-000000000002', 'Field Engineering', true, '2024-11-18');

-- Inventory Items for Maitri (for depletion forecast demo)
INSERT INTO inventory_items (id, station_id, item_name, category, unit, current_quantity, minimum_threshold, daily_consumption_rate, last_resupply_date, data_source, confidence_score) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Diesel Fuel', 'FUEL', 'liters', 2800, 1000, 45, '2024-11-01', 'MEASURED', 98.5),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Medical Antibiotics', 'MEDICAL', 'units', 85, 50, 1.2, '2024-11-01', 'MEASURED', 95.0),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Dried Food Rations', 'FOOD', 'kg', 420, 200, 8.5, '2024-11-01', 'MEASURED', 99.2),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Emergency Oxygen', 'MEDICAL', 'units', 22, 15, 0.3, '2024-10-20', 'MEASURED', 97.8);

-- Hazards for route planning demo
INSERT INTO hazards (id, hazard_type, latitude, longitude, location, severity, detection_method, detection_confidence, status, data_source, confidence_score, metadata) VALUES
('d0000000-0000-0000-0000-000000000001', 'CREVASSE', -70.7500, 11.7500, ST_SetSRID(ST_MakePoint(11.7500, -70.7500), 4326), 'HIGH', 'YOLOV8', 92.3, 'ACTIVE', 'MEASURED', 92.3, '{"detection_date": "2024-12-15", "width_meters": 2.5}'),
('d0000000-0000-0000-0000-000000000002', 'THIN_ICE', -70.0700, 12.0200, ST_SetSRID(ST_MakePoint(12.0200, -70.0700), 4326), 'CRITICAL', 'SENSOR', 88.7, 'ACTIVE', 'MEASURED', 88.7, '{"ice_thickness_cm": 8}'),
('d0000000-0000-0000-0000-000000000003', 'CREVASSE', -69.4200, 76.1700, ST_SetSRID(ST_MakePoint(76.1700, -69.4200), 4326), 'MEDIUM', 'YOLOV8', 85.1, 'ACTIVE', 'MEASURED', 85.1, '{"detection_date": "2024-12-18"}');

-- Wellness data for combined risk alert demo (declining trend)
INSERT INTO wellness_checkins (personnel_id, station_id, checkin_date, mood_score, fatigue_level, stress_level, sleep_hours, data_source) VALUES
-- Ramesh Gupta - declining wellness
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2024-12-10', 7, 4, 3, 7.5, 'MANUAL_ENTRY'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2024-12-15', 6, 6, 5, 6.2, 'MANUAL_ENTRY'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2024-12-18', 4, 8, 7, 5.1, 'MANUAL_ENTRY'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '2024-12-19', 3, 9, 8, 4.5, 'MANUAL_ENTRY'),

-- Sunita Verma - stable
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '2024-12-18', 7, 5, 4, 7.0, 'MANUAL_ENTRY'),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '2024-12-19', 7, 4, 4, 7.2, 'MANUAL_ENTRY');

-- Cargo manifest for optimization demo
INSERT INTO cargo_manifests (id, manifest_code, origin_station_id, destination_station_id, shipment_date, status, priority_level, items, data_source) VALUES
('e0000000-0000-0000-0000-000000000001', 'CARGO-2024-12-001', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '2024-12-25', 'PENDING', 8, 
'[
    {"item_name": "Medical Supplies", "quantity": 50, "weight": 120, "volume": 2.5, "priority": 10},
    {"item_name": "Food Rations", "quantity": 200, "weight": 450, "volume": 8.0, "priority": 9},
    {"item_name": "Fuel Drums", "quantity": 10, "weight": 800, "volume": 12.0, "priority": 8},
    {"item_name": "Scientific Equipment", "quantity": 5, "weight": 200, "volume": 3.0, "priority": 6},
    {"item_name": "Spare Parts", "quantity": 30, "weight": 150, "volume": 2.0, "priority": 5}
]'::jsonb, 'MANUAL_ENTRY');

-- Sample SOS event (resolved) for testing
INSERT INTO sos_events (id, event_code, personnel_id, station_id, latitude, longitude, location, severity, category, message, status, data_source) VALUES
('f0000000-0000-0000-0000-000000000001', 'SOS-2024-12-001', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', -70.7700, 11.7400, ST_SetSRID(ST_MakePoint(11.7400, -70.7700), 4326), 'MEDIUM', 'EQUIPMENT', 'Generator malfunction, backup power activated', 'RESOLVED', 'MEASURED');

-- Sample alerts
INSERT INTO alerts (alert_type, severity, title, message, station_id, data_source, confidence_score) VALUES
('INVENTORY_LOW', 'HIGH', 'Fuel Approaching Minimum Threshold', 'Diesel fuel at Maitri station predicted to reach minimum threshold in 18 days', 'a0000000-0000-0000-0000-000000000001', 'SIMULATED', 87.5),
('HAZARD_DETECTED', 'CRITICAL', 'Critical Ice Hazard Detected', 'Thin ice detected on primary route to supply depot', 'a0000000-0000-0000-0000-000000000003', 'MEASURED', 88.7);

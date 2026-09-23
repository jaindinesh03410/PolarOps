-- Antarctic Research Station Management System
-- Database Schema & Migrations
-- SIH 26062

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom types
CREATE TYPE data_source_type AS ENUM ('MEASURED', 'SIMULATED', 'MANUAL_ENTRY');
CREATE TYPE personnel_role AS ENUM ('HQ_ADMIN', 'STATION_COMMANDER', 'LOGISTICS_OFFICER', 'MEDICAL_OFFICER', 'FIELD_CREW');
CREATE TYPE station_status AS ENUM ('ACTIVE', 'ISOLATED', 'EMERGENCY', 'OFFLINE');
CREATE TYPE sos_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');
CREATE TYPE sos_severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE sos_category AS ENUM ('MEDICAL', 'STRUCTURAL', 'WEATHER', 'EQUIPMENT', 'OTHER');
CREATE TYPE alert_type AS ENUM ('INVENTORY_LOW', 'WELLNESS_CONCERN', 'HAZARD_DETECTED', 'SOS_TRIGGERED', 'COMPLIANCE_VIOLATION', 'COMBINED_RISK');
CREATE TYPE alert_severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- ============================================
-- CORE TABLES
-- ============================================

-- Stations
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status station_status DEFAULT 'ACTIVE',
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    established_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personnel
CREATE TABLE personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id),
    full_name VARCHAR(255) NOT NULL,
    role personnel_role NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    emergency_contact JSONB,
    specialization VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    arrival_date DATE,
    expected_departure_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roster Movements (location tracking log)
CREATE TABLE roster_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE,
    from_station_id UUID REFERENCES stations(id),
    to_station_id UUID REFERENCES stations(id),
    movement_type VARCHAR(50), -- 'ASSIGNMENT', 'TRANSFER', 'FIELD_TRIP', 'EVACUATION'
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    status VARCHAR(50), -- 'PLANNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'
    notes TEXT,
    data_source data_source_type DEFAULT 'MANUAL_ENTRY',
    confidence_score NUMERIC(5,2) DEFAULT 100.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'FOOD', 'MEDICAL', 'FUEL', 'EQUIPMENT', 'OTHER'
    unit VARCHAR(50), -- 'kg', 'liters', 'units', etc.
    current_quantity NUMERIC(10,2) NOT NULL,
    minimum_threshold NUMERIC(10,2),
    daily_consumption_rate NUMERIC(10,2),
    last_resupply_date DATE,
    next_resupply_date DATE,
    data_source data_source_type DEFAULT 'MEASURED',
    confidence_score NUMERIC(5,2) DEFAULT 100.00 CHECK (confidence_score BETWEEN 0 AND 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Forecasts (Prophet output cache)
CREATE TABLE inventory_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    predicted_depletion_date DATE NOT NULL,
    confidence_lower NUMERIC(10,2),
    confidence_upper NUMERIC(10,2),
    confidence_score NUMERIC(5,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    model_version VARCHAR(50),
    explanation TEXT,
    forecast_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cargo Manifests
CREATE TABLE cargo_manifests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manifest_code VARCHAR(50) UNIQUE NOT NULL,
    origin_station_id UUID REFERENCES stations(id),
    destination_station_id UUID REFERENCES stations(id),
    shipment_date DATE,
    expected_arrival_date DATE,
    status VARCHAR(50), -- 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
    total_weight NUMERIC(10,2),
    total_volume NUMERIC(10,2),
    priority_level INTEGER DEFAULT 5,
    items JSONB DEFAULT '[]', -- Array of {item_name, quantity, weight, volume}
    data_source data_source_type DEFAULT 'MANUAL_ENTRY',
    confidence_score NUMERIC(5,2) DEFAULT 100.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cargo Optimizations (Knapsack solver results)
CREATE TABLE cargo_optimizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manifest_id UUID REFERENCES cargo_manifests(id) ON DELETE CASCADE,
    constraint_type VARCHAR(50), -- 'WEIGHT', 'VOLUME', 'COMBINED'
    max_capacity NUMERIC(10,2),
    optimized_items JSONB NOT NULL, -- Selected items with explanation
    excluded_items JSONB, -- Items excluded with reasons
    total_value NUMERIC(10,2),
    utilization_percent NUMERIC(5,2),
    explanation TEXT,
    confidence_score NUMERIC(5,2) DEFAULT 95.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes (A* computed paths)
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(255),
    start_point GEOGRAPHY(POINT, 4326) NOT NULL,
    end_point GEOGRAPHY(POINT, 4326) NOT NULL,
    waypoints JSONB, -- Array of {lat, lng, sequence}
    path_geojson JSONB, -- Full GeoJSON LineString
    total_distance_km NUMERIC(10,2),
    estimated_time_hours NUMERIC(6,2),
    hazards_avoided JSONB, -- Array of hazard IDs avoided
    explanation TEXT,
    confidence_score NUMERIC(5,2) DEFAULT 90.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_by UUID REFERENCES personnel(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hazards (detected crevasses, ice conditions)
CREATE TABLE hazards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_type VARCHAR(50), -- 'CREVASSE', 'THIN_ICE', 'AVALANCHE_ZONE', 'WEATHER'
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    bounding_box JSONB, -- {min_lat, max_lat, min_lng, max_lng}
    severity alert_severity DEFAULT 'MEDIUM',
    detection_method VARCHAR(50), -- 'YOLOV8', 'MANUAL', 'SENSOR'
    source_image_url TEXT,
    detection_confidence NUMERIC(5,2),
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'CLEARED', 'MONITORING'
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    reported_by UUID REFERENCES personnel(id),
    data_source data_source_type DEFAULT 'MEASURED',
    confidence_score NUMERIC(5,2) DEFAULT 85.00 CHECK (confidence_score BETWEEN 0 AND 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS Events
CREATE TABLE sos_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_code VARCHAR(50) UNIQUE NOT NULL,
    personnel_id UUID REFERENCES personnel(id),
    station_id UUID REFERENCES stations(id),
    location GEOGRAPHY(POINT, 4326),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    severity sos_severity NOT NULL,
    category sos_category,
    message TEXT,
    triage_result JSONB, -- {predicted_severity, predicted_category, keywords, explanation, confidence}
    status sos_status DEFAULT 'OPEN',
    acknowledged_by UUID REFERENCES personnel(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    response_notes TEXT,
    data_source data_source_type DEFAULT 'MEASURED',
    confidence_score NUMERIC(5,2) DEFAULT 100.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wellness Check-ins
CREATE TABLE wellness_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id),
    checkin_date DATE NOT NULL,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    fatigue_level INTEGER CHECK (fatigue_level BETWEEN 1 AND 10),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    sleep_hours NUMERIC(4,2),
    symptoms TEXT[],
    notes TEXT,
    data_source data_source_type DEFAULT 'MANUAL_ENTRY',
    confidence_score NUMERIC(5,2) DEFAULT 100.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts (system-generated)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    station_id UUID REFERENCES stations(id),
    related_entity_type VARCHAR(50), -- 'PERSONNEL', 'INVENTORY', 'SOS', 'HAZARD', etc.
    related_entity_id UUID,
    correlation_data JSONB, -- For COMBINED_RISK alerts: array of contributing signals
    explanation TEXT,
    is_read BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES personnel(id),
    acknowledged_at TIMESTAMPTZ,
    data_source data_source_type DEFAULT 'SIMULATED',
    confidence_score NUMERIC(5,2) DEFAULT 80.00 CHECK (confidence_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Flags (Antarctic Treaty Act 2022)
CREATE TABLE compliance_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_code VARCHAR(50) NOT NULL,
    rule_description TEXT NOT NULL,
    violation_type VARCHAR(100),
    severity alert_severity DEFAULT 'MEDIUM',
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    flagged_data JSONB,
    resolution_required BOOLEAN DEFAULT true,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES personnel(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (tamper-proof ledger)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    personnel_id UUID REFERENCES personnel(id),
    action_type VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SOS_TRIGGER', etc.
    entity_type VARCHAR(50), -- 'INVENTORY', 'SOS', 'CARGO', 'PERSONNEL', etc.
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_personnel_station ON personnel(station_id);
CREATE INDEX idx_personnel_role ON personnel(role);
CREATE INDEX idx_inventory_station ON inventory_items(station_id);
CREATE INDEX idx_cargo_destination ON cargo_manifests(destination_station_id);
CREATE INDEX idx_sos_status ON sos_events(status);
CREATE INDEX idx_sos_station ON sos_events(station_id);
CREATE INDEX idx_hazards_location ON hazards USING GIST(location);
CREATE INDEX idx_routes_start ON routes USING GIST(start_point);
CREATE INDEX idx_wellness_personnel ON wellness_checkins(personnel_id, checkin_date DESC);
CREATE INDEX idx_alerts_station ON alerts(station_id, created_at DESC);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cargo_updated_at BEFORE UPDATE ON cargo_manifests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hazards_updated_at BEFORE UPDATE ON hazards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sos_updated_at BEFORE UPDATE ON sos_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

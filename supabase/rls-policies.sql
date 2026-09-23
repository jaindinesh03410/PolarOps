-- Row Level Security (RLS) Policies
-- Antarctic Research Station Management System

-- Enable RLS on all tables
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's personnel record
CREATE OR REPLACE FUNCTION get_current_personnel()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM personnel WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS personnel_role AS $$
BEGIN
    RETURN (SELECT role FROM personnel WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's station_id
CREATE OR REPLACE FUNCTION get_current_station()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT station_id FROM personnel WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STATIONS POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to stations"
    ON stations FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Station Commander read own station"
    ON stations FOR SELECT
    USING (
        get_current_role() = 'STATION_COMMANDER' 
        AND id = get_current_station()
    );

CREATE POLICY "All roles can read stations"
    ON stations FOR SELECT
    USING (true);

-- ============================================
-- PERSONNEL POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to personnel"
    ON personnel FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Medical Officer read all personnel"
    ON personnel FOR SELECT
    USING (get_current_role() = 'MEDICAL_OFFICER');

CREATE POLICY "Station Commander manage own station personnel"
    ON personnel FOR ALL
    USING (
        get_current_role() = 'STATION_COMMANDER'
        AND station_id = get_current_station()
    );

CREATE POLICY "Field Crew read own record"
    ON personnel FOR SELECT
    USING (id = get_current_personnel());

CREATE POLICY "Field Crew update own record"
    ON personnel FOR UPDATE
    USING (id = get_current_personnel());

-- ============================================
-- ROSTER MOVEMENTS POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to roster"
    ON roster_movements FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Logistics Officer full access to roster"
    ON roster_movements FOR ALL
    USING (get_current_role() = 'LOGISTICS_OFFICER');

CREATE POLICY "Users read own movements"
    ON roster_movements FOR SELECT
    USING (personnel_id = get_current_personnel());

-- ============================================
-- INVENTORY POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to inventory"
    ON inventory_items FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Station Commander manage own station inventory"
    ON inventory_items FOR ALL
    USING (
        get_current_role() = 'STATION_COMMANDER'
        AND station_id = get_current_station()
    );

CREATE POLICY "Logistics Officer full access to inventory"
    ON inventory_items FOR ALL
    USING (get_current_role() = 'LOGISTICS_OFFICER');

CREATE POLICY "Field Crew read own station inventory"
    ON inventory_items FOR SELECT
    USING (station_id = get_current_station());

-- ============================================
-- INVENTORY FORECASTS POLICIES
-- ============================================
CREATE POLICY "All authenticated users read forecasts"
    ON inventory_forecasts FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert forecasts"
    ON inventory_forecasts FOR INSERT
    WITH CHECK (true);

-- ============================================
-- CARGO POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to cargo"
    ON cargo_manifests FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Logistics Officer full access to cargo"
    ON cargo_manifests FOR ALL
    USING (get_current_role() = 'LOGISTICS_OFFICER');

CREATE POLICY "Station Commander read cargo for own station"
    ON cargo_manifests FOR SELECT
    USING (
        get_current_role() = 'STATION_COMMANDER'
        AND (origin_station_id = get_current_station() OR destination_station_id = get_current_station())
    );

-- ============================================
-- CARGO OPTIMIZATIONS POLICIES
-- ============================================
CREATE POLICY "Logistics Officer full access to optimizations"
    ON cargo_optimizations FOR ALL
    USING (get_current_role() IN ('LOGISTICS_OFFICER', 'HQ_ADMIN'));

CREATE POLICY "Others read optimizations"
    ON cargo_optimizations FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- ROUTES POLICIES
-- ============================================
CREATE POLICY "Logistics Officer full access to routes"
    ON routes FOR ALL
    USING (get_current_role() IN ('LOGISTICS_OFFICER', 'HQ_ADMIN'));

CREATE POLICY "All authenticated read routes"
    ON routes FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- HAZARDS POLICIES
-- ============================================
CREATE POLICY "All authenticated read hazards"
    ON hazards FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Field Crew can report hazards"
    ON hazards FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "HQ Admin and Commanders update hazards"
    ON hazards FOR UPDATE
    USING (get_current_role() IN ('HQ_ADMIN', 'STATION_COMMANDER', 'LOGISTICS_OFFICER'));

-- ============================================
-- SOS EVENTS POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to SOS"
    ON sos_events FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Medical Officer full access to SOS"
    ON sos_events FOR ALL
    USING (get_current_role() = 'MEDICAL_OFFICER');

CREATE POLICY "Station Commander read own station SOS"
    ON sos_events FOR SELECT
    USING (
        get_current_role() = 'STATION_COMMANDER'
        AND station_id = get_current_station()
    );

CREATE POLICY "Field Crew create SOS"
    ON sos_events FOR INSERT
    WITH CHECK (personnel_id = get_current_personnel());

CREATE POLICY "Field Crew read own SOS"
    ON sos_events FOR SELECT
    USING (personnel_id = get_current_personnel());

-- ============================================
-- WELLNESS CHECKINS POLICIES
-- ============================================
CREATE POLICY "Medical Officer read all wellness"
    ON wellness_checkins FOR SELECT
    USING (get_current_role() IN ('MEDICAL_OFFICER', 'HQ_ADMIN'));

CREATE POLICY "Station Commander read own station wellness"
    ON wellness_checkins FOR SELECT
    USING (
        get_current_role() = 'STATION_COMMANDER'
        AND station_id = get_current_station()
    );

CREATE POLICY "Personnel submit own wellness"
    ON wellness_checkins FOR INSERT
    WITH CHECK (personnel_id = get_current_personnel());

CREATE POLICY "Personnel read own wellness"
    ON wellness_checkins FOR SELECT
    USING (personnel_id = get_current_personnel());

-- ============================================
-- ALERTS POLICIES
-- ============================================
CREATE POLICY "HQ Admin read all alerts"
    ON alerts FOR SELECT
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "Station Commander read own station alerts"
    ON alerts FOR SELECT
    USING (
        get_current_role() = 'STATION_COMMANDER'
        AND (station_id = get_current_station() OR station_id IS NULL)
    );

CREATE POLICY "Medical Officer read relevant alerts"
    ON alerts FOR SELECT
    USING (
        get_current_role() = 'MEDICAL_OFFICER'
        AND alert_type IN ('WELLNESS_CONCERN', 'SOS_TRIGGERED', 'COMBINED_RISK')
    );

CREATE POLICY "Logistics Officer read relevant alerts"
    ON alerts FOR SELECT
    USING (
        get_current_role() = 'LOGISTICS_OFFICER'
        AND alert_type IN ('INVENTORY_LOW', 'HAZARD_DETECTED')
    );

CREATE POLICY "System can create alerts"
    ON alerts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can acknowledge alerts"
    ON alerts FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================
-- COMPLIANCE FLAGS POLICIES
-- ============================================
CREATE POLICY "HQ Admin full access to compliance"
    ON compliance_flags FOR ALL
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "All roles read compliance flags"
    ON compliance_flags FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "HQ Admin read all audit logs"
    ON audit_logs FOR SELECT
    USING (get_current_role() = 'HQ_ADMIN');

CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users read own audit logs"
    ON audit_logs FOR SELECT
    USING (user_id = auth.uid());

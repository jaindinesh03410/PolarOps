-- Audit Trigger Function
-- Automatically logs all INSERT/UPDATE/DELETE operations on sensitive tables

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    personnel_record UUID;
BEGIN
    -- Get personnel_id for current user
    SELECT id INTO personnel_record FROM personnel WHERE user_id = auth.uid() LIMIT 1;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (
            user_id,
            personnel_id,
            action_type,
            entity_type,
            entity_id,
            old_data,
            metadata
        ) VALUES (
            auth.uid(),
            personnel_record,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD),
            jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
        );
        RETURN OLD;
    
    -- Handle INSERT
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            user_id,
            personnel_id,
            action_type,
            entity_type,
            entity_id,
            new_data,
            metadata
        ) VALUES (
            auth.uid(),
            personnel_record,
            'CREATE',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(NEW),
            jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
        );
        RETURN NEW;
    
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            user_id,
            personnel_id,
            action_type,
            entity_type,
            entity_id,
            old_data,
            new_data,
            metadata
        ) VALUES (
            auth.uid(),
            personnel_record,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            jsonb_build_object(
                'table', TG_TABLE_NAME, 
                'operation', TG_OP,
                'changed_fields', (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(to_jsonb(NEW))
                    WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
                )
            )
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_sos_events
    AFTER INSERT OR UPDATE OR DELETE ON sos_events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_cargo_manifests
    AFTER INSERT OR UPDATE OR DELETE ON cargo_manifests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_inventory_items
    AFTER INSERT OR UPDATE OR DELETE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_personnel
    AFTER INSERT OR UPDATE OR DELETE ON personnel
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_compliance_flags
    AFTER INSERT OR UPDATE OR DELETE ON compliance_flags
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_hazards
    AFTER INSERT OR UPDATE OR DELETE ON hazards
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_wellness_checkins
    AFTER INSERT OR UPDATE OR DELETE ON wellness_checkins
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

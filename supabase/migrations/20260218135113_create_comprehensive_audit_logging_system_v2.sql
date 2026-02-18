/*
  # Create Comprehensive Audit Logging System

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `action_type` (text) - e.g., 'order_status_change', 'price_change', 'stock_adjustment', 'user_deletion'
      - `entity_type` (text) - e.g., 'order', 'inventory', 'user'
      - `entity_id` (uuid) - the ID of the affected entity
      - `old_value` (jsonb) - previous state
      - `new_value` (jsonb) - new state
      - `metadata` (jsonb) - additional context
      - `location_id` (bigint) - for multi-location tracking
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `audit_logs` table
    - Only admins/owners can view audit logs
    - System automatically creates logs (no manual insertion by regular users)

  3. Functions
    - Helper function to create audit log entries
    - Triggers for automatic logging on critical tables
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  location_id bigint REFERENCES locations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_location_id ON audit_logs(location_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins/owners can view audit logs
CREATE POLICY "Admins and owners can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Helper function to create audit log
CREATE OR REPLACE FUNCTION log_audit(
  p_action_type text,
  p_entity_type text,
  p_entity_id text,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_location_id bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    old_value,
    new_value,
    metadata,
    location_id,
    created_at
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_old_value,
    p_new_value,
    p_metadata,
    p_location_id,
    now()
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Trigger function for order stage changes
CREATE OR REPLACE FUNCTION audit_order_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_stage text;
  v_new_stage text;
BEGIN
  -- Get stage names
  SELECT name INTO v_old_stage FROM order_stages WHERE id = OLD.stage_id;
  SELECT name INTO v_new_stage FROM order_stages WHERE id = NEW.stage_id;
  
  -- Only log if stage actually changed
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    PERFORM log_audit(
      'order_status_change',
      'order',
      NEW.id::text,
      jsonb_build_object('stage_id', OLD.stage_id, 'stage_name', v_old_stage),
      jsonb_build_object('stage_id', NEW.stage_id, 'stage_name', v_new_stage),
      jsonb_build_object('order_number', NEW.order_number),
      NEW.location_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for order cost changes
CREATE OR REPLACE FUNCTION audit_order_cost_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log if total_cost changed significantly (more than 0.01)
  IF ABS(COALESCE(OLD.total_cost, 0) - COALESCE(NEW.total_cost, 0)) > 0.01 THEN
    PERFORM log_audit(
      'order_price_change',
      'order',
      NEW.id::text,
      jsonb_build_object('total_cost', OLD.total_cost, 'prepayment', OLD.prepayment),
      jsonb_build_object('total_cost', NEW.total_cost, 'prepayment', NEW.prepayment),
      jsonb_build_object('order_number', NEW.order_number, 'price_difference', NEW.total_cost - OLD.total_cost),
      NEW.location_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for inventory adjustments
CREATE OR REPLACE FUNCTION audit_inventory_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if quantity changed
  IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
    PERFORM log_audit(
      'stock_adjustment',
      'inventory',
      NEW.id::text,
      jsonb_build_object('quantity', OLD.quantity),
      jsonb_build_object('quantity', NEW.quantity),
      jsonb_build_object('part_name', NEW.part_name, 'sku', NEW.sku, 'quantity_change', NEW.quantity - OLD.quantity),
      NEW.location_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function for user deletions
CREATE OR REPLACE FUNCTION audit_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_audit(
    'user_deletion',
    'profile',
    OLD.id::text,
    jsonb_build_object('full_name', OLD.full_name, 'role', OLD.role),
    NULL,
    jsonb_build_object('deleted_at', now()),
    OLD.location_id
  );
  
  RETURN OLD;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_audit_order_stage_change ON orders;
CREATE TRIGGER trigger_audit_order_stage_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  EXECUTE FUNCTION audit_order_stage_change();

DROP TRIGGER IF EXISTS trigger_audit_order_cost_change ON orders;
CREATE TRIGGER trigger_audit_order_cost_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (ABS(COALESCE(OLD.total_cost, 0) - COALESCE(NEW.total_cost, 0)) > 0.01)
  EXECUTE FUNCTION audit_order_cost_change();

DROP TRIGGER IF EXISTS trigger_audit_inventory_adjustment ON inventory;
CREATE TRIGGER trigger_audit_inventory_adjustment
  AFTER UPDATE ON inventory
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION audit_inventory_adjustment();

DROP TRIGGER IF EXISTS trigger_audit_user_deletion ON profiles;
CREATE TRIGGER trigger_audit_user_deletion
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_user_deletion();

-- Grant execute permission on log_audit function
GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

-- Create view for easy audit log reading
CREATE OR REPLACE VIEW audit_logs_with_user AS
SELECT 
  al.*,
  p.full_name as user_name,
  p.role as user_role,
  l.name as location_name
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
LEFT JOIN locations l ON al.location_id = l.id;

COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for all sensitive operations in the system';
COMMENT ON FUNCTION log_audit IS 'Helper function to manually create audit log entries from application code';

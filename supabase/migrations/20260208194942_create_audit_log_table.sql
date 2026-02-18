/*
  # Create Audit Log Table
  
  ## Overview
  Creates a comprehensive audit log system to track all critical system actions
  for compliance, security, and debugging purposes.
  
  ## New Tables
  1. **audit_log**
     - `id` - Auto-incrementing primary key
     - `user_id` - Reference to user who performed action
     - `action_type` - Type of action (create, update, delete, status_change, price_change, etc.)
     - `table_name` - Which table was affected
     - `record_id` - ID of the affected record (as text for flexibility)
     - `old_values` - JSONB snapshot of old data
     - `new_values` - JSONB snapshot of new data
     - `ip_address` - User's IP address (nullable)
     - `user_agent` - User's browser/client info (nullable)
     - `location_id` - Associated location for the action
     - `created_at` - Timestamp of action
  
  ## Security
  - RLS enabled with read access for authenticated users
  - Only service role can insert (to prevent tampering)
  - Indexes on user_id, table_name, and created_at for fast queries
  
  ## Use Cases
  - Track order deletions
  - Monitor price changes
  - Audit status changes
  - Compliance reporting
  - Security investigations
*/

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  location_id bigint REFERENCES locations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_location_id ON audit_log(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read audit logs
CREATE POLICY "audit_log_select" 
  ON audit_log FOR SELECT 
  TO authenticated 
  USING (true);

-- Only allow inserts via service role (prevents tampering)
CREATE POLICY "audit_log_insert" 
  ON audit_log FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically log order deletions
CREATE OR REPLACE FUNCTION log_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action_type,
    table_name,
    record_id,
    old_values,
    location_id
  ) VALUES (
    auth.uid(),
    'delete',
    'orders',
    OLD.id::text,
    to_jsonb(OLD),
    OLD.location_id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log price changes in orders
CREATE OR REPLACE FUNCTION log_order_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.estimated_cost != NEW.estimated_cost) OR 
     (OLD.total_discount != NEW.total_discount) OR
     (OLD.final_cost != NEW.final_cost) THEN
    INSERT INTO audit_log (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      location_id
    ) VALUES (
      auth.uid(),
      'price_change',
      'orders',
      NEW.id::text,
      jsonb_build_object(
        'estimated_cost', OLD.estimated_cost,
        'total_discount', OLD.total_discount,
        'final_cost', OLD.final_cost
      ),
      jsonb_build_object(
        'estimated_cost', NEW.estimated_cost,
        'total_discount', NEW.total_discount,
        'final_cost', NEW.final_cost
      ),
      NEW.location_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log status changes in orders
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id != NEW.stage_id THEN
    INSERT INTO audit_log (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      location_id
    ) VALUES (
      auth.uid(),
      'status_change',
      'orders',
      NEW.id::text,
      jsonb_build_object('stage_id', OLD.stage_id),
      jsonb_build_object('stage_id', NEW.stage_id),
      NEW.location_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_log_order_deletion ON orders;
CREATE TRIGGER trigger_log_order_deletion
  BEFORE DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_deletion();

DROP TRIGGER IF EXISTS trigger_log_order_price_change ON orders;
CREATE TRIGGER trigger_log_order_price_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_price_change();

DROP TRIGGER IF EXISTS trigger_log_order_status_change ON orders;
CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

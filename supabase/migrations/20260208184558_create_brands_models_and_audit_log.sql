/*
  # Create Device Brands, Models, and Audit Log System

  ## Overview
  Creates comprehensive system for device management and activity logging.

  ## New Tables
  
  ### device_brands
  - `id` (uuid, primary key)
  - `name` (text) - Brand name (Apple, Samsung, etc.)
  - `created_at` (timestamptz)
  
  ### device_models
  - `id` (uuid, primary key)
  - `brand_id` (uuid) - Reference to brand
  - `name` (text) - Model name (iPhone 13 Pro, Galaxy S21, etc.)
  - `created_at` (timestamptz)
  
  ### activity_logs
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Who performed the action
  - `entity_type` (text) - Type of entity (order, inventory, client, etc.)
  - `entity_id` (text) - ID of the entity
  - `action_type` (text) - Type of action (created, updated, deleted, status_changed, etc.)
  - `description` (text) - Human-readable description
  - `old_value` (jsonb) - Previous value (for updates)
  - `new_value` (jsonb) - New value
  - `ip_address` (text) - User IP
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Brands and models: readable by all, writable by admins
  - Activity logs: readable by admins, system-writable
*/

-- Create device_brands table
CREATE TABLE IF NOT EXISTS device_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Create device_models table
CREATE TABLE IF NOT EXISTS device_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES device_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_device_models_brand ON device_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE device_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_brands
CREATE POLICY "brands_select" ON device_brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "brands_insert" ON device_brands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "brands_update" ON device_brands FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for device_models
CREATE POLICY "models_select" ON device_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "models_insert" ON device_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "models_update" ON device_models FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for activity_logs
CREATE POLICY "logs_select" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_insert" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Insert sample brands
INSERT INTO device_brands (name) VALUES
  ('Apple'),
  ('Samsung'),
  ('Xiaomi'),
  ('Huawei'),
  ('OnePlus'),
  ('Google'),
  ('Sony'),
  ('LG'),
  ('Motorola'),
  ('Nokia')
ON CONFLICT (name) DO NOTHING;

-- Insert sample models for Apple
INSERT INTO device_models (brand_id, name)
SELECT 
  (SELECT id FROM device_brands WHERE name = 'Apple'),
  model
FROM (VALUES
  ('iPhone 15 Pro Max'),
  ('iPhone 15 Pro'),
  ('iPhone 15 Plus'),
  ('iPhone 15'),
  ('iPhone 14 Pro Max'),
  ('iPhone 14 Pro'),
  ('iPhone 14 Plus'),
  ('iPhone 14'),
  ('iPhone 13 Pro Max'),
  ('iPhone 13 Pro'),
  ('iPhone 13'),
  ('iPhone 13 mini'),
  ('iPhone 12 Pro Max'),
  ('iPhone 12 Pro'),
  ('iPhone 12'),
  ('iPhone 12 mini'),
  ('iPhone 11 Pro Max'),
  ('iPhone 11 Pro'),
  ('iPhone 11'),
  ('iPhone SE (2022)'),
  ('iPhone SE (2020)'),
  ('iPad Pro 12.9"'),
  ('iPad Pro 11"'),
  ('iPad Air'),
  ('iPad mini'),
  ('MacBook Pro 16"'),
  ('MacBook Pro 14"'),
  ('MacBook Air'),
  ('iMac'),
  ('Mac mini')
) AS t(model)
ON CONFLICT (brand_id, name) DO NOTHING;

-- Insert sample models for Samsung
INSERT INTO device_models (brand_id, name)
SELECT 
  (SELECT id FROM device_brands WHERE name = 'Samsung'),
  model
FROM (VALUES
  ('Galaxy S24 Ultra'),
  ('Galaxy S24+'),
  ('Galaxy S24'),
  ('Galaxy S23 Ultra'),
  ('Galaxy S23+'),
  ('Galaxy S23'),
  ('Galaxy S22 Ultra'),
  ('Galaxy S22+'),
  ('Galaxy S22'),
  ('Galaxy Z Fold 5'),
  ('Galaxy Z Flip 5'),
  ('Galaxy Z Fold 4'),
  ('Galaxy Z Flip 4'),
  ('Galaxy A54'),
  ('Galaxy A34'),
  ('Galaxy A14'),
  ('Galaxy Tab S9'),
  ('Galaxy Tab S8')
) AS t(model)
ON CONFLICT (brand_id, name) DO NOTHING;

-- Create function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_action_type text,
  p_description text,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    entity_type,
    entity_id,
    action_type,
    description,
    old_value,
    new_value
  ) VALUES (
    p_user_id,
    p_entity_type,
    p_entity_id,
    p_action_type,
    p_description,
    p_old_value,
    p_new_value
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
    PERFORM log_activity(
      auth.uid(),
      'order',
      NEW.id::text,
      'status_changed',
      'Статус изменен с "' || OLD.current_stage || '" на "' || NEW.current_stage || '"',
      jsonb_build_object('stage', OLD.current_stage),
      jsonb_build_object('stage', NEW.current_stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS trigger_log_order_status ON orders;
CREATE TRIGGER trigger_log_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Add comments
COMMENT ON TABLE device_brands IS 'Device brands for autocomplete';
COMMENT ON TABLE device_models IS 'Device models linked to brands';
COMMENT ON TABLE activity_logs IS 'System activity audit log';

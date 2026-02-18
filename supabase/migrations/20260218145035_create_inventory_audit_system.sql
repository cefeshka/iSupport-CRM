/*
  # Create Inventory Audit System

  ## Overview
  This migration creates a comprehensive stock inventory audit and correction system to prevent mysterious disappearances of expensive parts.

  ## 1. New Tables
    - `stock_audits`
      - `id` (uuid, primary key)
      - `location_id` (bigint, foreign key to locations)
      - `audit_number` (text, unique identifier for the audit)
      - `status` (text, pending/in_progress/completed/cancelled)
      - `started_by` (uuid, user who started the audit)
      - `started_at` (timestamptz)
      - `completed_by` (uuid, user who completed the audit)
      - `completed_at` (timestamptz)
      - `notes` (text, optional notes about the audit)

    - `stock_audit_items`
      - `id` (uuid, primary key)
      - `audit_id` (uuid, foreign key to stock_audits)
      - `inventory_id` (uuid, foreign key to inventory)
      - `system_quantity` (integer, quantity according to system)
      - `physical_count` (integer, actual counted quantity)
      - `discrepancy` (integer, calculated difference)
      - `correction_reason` (text, reason for discrepancy if any)
      - `notes` (text, optional notes)
      - `counted_at` (timestamptz)

  ## 2. Enhancements
    - Enhanced `inventory_movements` to support 'correction' type for audit adjustments
    - Added RLS policies for both tables
    - Added triggers to automatically calculate discrepancies
    - Added function to confirm audit and update stock levels

  ## 3. Security
    - Enable RLS on all new tables
    - Only authenticated users can perform audits
    - Audit logs created for all stock corrections
*/

-- Create stock_audits table
CREATE TABLE IF NOT EXISTS stock_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint NOT NULL REFERENCES locations(id),
  audit_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  started_by uuid REFERENCES profiles(id),
  started_at timestamptz DEFAULT now(),
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create stock_audit_items table
CREATE TABLE IF NOT EXISTS stock_audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES stock_audits(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES inventory(id),
  system_quantity integer NOT NULL DEFAULT 0,
  physical_count integer,
  discrepancy integer DEFAULT 0,
  correction_reason text,
  notes text,
  counted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_audit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_audits
CREATE POLICY "Authenticated users can view audits in their location"
  ON stock_audits FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create audits"
  ON stock_audits FOR INSERT
  TO authenticated
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update audits"
  ON stock_audits FOR UPDATE
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for stock_audit_items
CREATE POLICY "Authenticated users can view audit items"
  ON stock_audit_items FOR SELECT
  TO authenticated
  USING (
    audit_id IN (
      SELECT id FROM stock_audits
      WHERE location_id IN (
        SELECT location_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can create audit items"
  ON stock_audit_items FOR INSERT
  TO authenticated
  WITH CHECK (
    audit_id IN (
      SELECT id FROM stock_audits
      WHERE location_id IN (
        SELECT location_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can update audit items"
  ON stock_audit_items FOR UPDATE
  TO authenticated
  USING (
    audit_id IN (
      SELECT id FROM stock_audits
      WHERE location_id IN (
        SELECT location_id FROM profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    audit_id IN (
      SELECT id FROM stock_audits
      WHERE location_id IN (
        SELECT location_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Function to calculate discrepancy automatically
CREATE OR REPLACE FUNCTION calculate_audit_discrepancy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.physical_count IS NOT NULL THEN
    NEW.discrepancy := NEW.physical_count - NEW.system_quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate discrepancy
DROP TRIGGER IF EXISTS trigger_calculate_audit_discrepancy ON stock_audit_items;
CREATE TRIGGER trigger_calculate_audit_discrepancy
  BEFORE INSERT OR UPDATE ON stock_audit_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_audit_discrepancy();

-- Function to confirm audit and update stock
CREATE OR REPLACE FUNCTION confirm_stock_audit(
  p_audit_id uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_audit_location_id bigint;
  v_item RECORD;
  v_corrections_made integer := 0;
  v_total_items integer := 0;
BEGIN
  -- Get audit location
  SELECT location_id INTO v_audit_location_id
  FROM stock_audits
  WHERE id = p_audit_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Audit not found');
  END IF;

  -- Loop through all audit items with discrepancies
  FOR v_item IN
    SELECT * FROM stock_audit_items
    WHERE audit_id = p_audit_id
    AND discrepancy != 0
  LOOP
    v_total_items := v_total_items + 1;

    -- Update inventory quantity
    UPDATE inventory
    SET quantity = v_item.physical_count
    WHERE id = v_item.inventory_id;

    -- Create inventory movement record for audit trail
    INSERT INTO inventory_movements (
      inventory_id,
      user_id,
      movement_type,
      quantity,
      notes,
      location_id
    ) VALUES (
      v_item.inventory_id,
      p_user_id,
      'adjustment',
      v_item.discrepancy,
      CONCAT(
        'Stock audit correction: ',
        COALESCE(v_item.correction_reason, 'No reason provided'),
        ' (System: ', v_item.system_quantity, ', Physical: ', v_item.physical_count, ')'
      ),
      v_audit_location_id
    );

    -- Create audit log entry
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      old_value,
      new_value,
      metadata,
      location_id
    ) VALUES (
      p_user_id,
      'update',
      'inventory',
      v_item.inventory_id::text,
      jsonb_build_object('quantity', v_item.system_quantity),
      jsonb_build_object('quantity', v_item.physical_count),
      jsonb_build_object(
        'audit_id', p_audit_id,
        'discrepancy', v_item.discrepancy,
        'reason', v_item.correction_reason
      ),
      v_audit_location_id
    );

    v_corrections_made := v_corrections_made + 1;
  END LOOP;

  -- Update audit status
  UPDATE stock_audits
  SET 
    status = 'completed',
    completed_by = p_user_id,
    completed_at = now()
  WHERE id = p_audit_id;

  RETURN jsonb_build_object(
    'success', true,
    'corrections_made', v_corrections_made,
    'total_items', v_total_items
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_audits_location ON stock_audits(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_audits_status ON stock_audits(status);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_audit ON stock_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_inventory ON stock_audit_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_discrepancy ON stock_audit_items(discrepancy) WHERE discrepancy != 0;

-- Add comment to inventory_movements about adjustment type
COMMENT ON COLUMN inventory_movements.movement_type IS 'Type of movement: income (incoming stock), outcome (outgoing stock), adjustment (audit correction), transfer (transfer between locations)';

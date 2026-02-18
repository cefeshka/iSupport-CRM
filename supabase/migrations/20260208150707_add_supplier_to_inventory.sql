/*
  # Add Supplier Reference to Inventory
  
  ## Overview
  This migration adds supplier tracking to inventory items and movement records.
  
  ## Changes
  
  ### 1. Inventory Enhancement
  - Add `supplier_id` column to track primary supplier for each part
  
  ### 2. Inventory Movements Enhancement  
  - Add `supplier_id` column to track supplier for incoming stock
  - Add `cost_per_unit` column to track purchase price for financial tracking
  
  ### 3. Sample Suppliers
  - Add a few sample supplier records for testing
  
  ## Safety
  All alterations use IF NOT EXISTS checks to prevent errors on re-run
*/

-- Add supplier_id to inventory if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE inventory ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add supplier_id to inventory_movements if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_movements' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add cost_per_unit to inventory_movements if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_movements' AND column_name = 'cost_per_unit'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN cost_per_unit decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Insert sample suppliers (only if none exist)
INSERT INTO suppliers (name, contact_person, phone, email, notes, user_id)
SELECT 
  name,
  contact_person,
  phone,
  email,
  notes,
  (SELECT id FROM auth.users LIMIT 1) as user_id
FROM (VALUES
  ('TechParts Supply Co.', 'John Smith', '+371 2000 0001', 'john@techparts.com', 'Main supplier for smartphone parts'),
  ('Global Components Ltd', 'Maria Garcia', '+371 2000 0002', 'maria@globalcomp.com', 'Laptop and tablet components'),
  ('FastShip Electronics', 'David Lee', '+371 2000 0003', 'david@fastship.com', 'Quick delivery for urgent orders'),
  ('Premium Parts Europe', 'Anna Mueller', '+371 2000 0004', 'anna@premiumparts.eu', 'High-quality original parts')
) AS new_suppliers(name, contact_person, phone, email, notes)
WHERE NOT EXISTS (SELECT 1 FROM suppliers LIMIT 1);
/*
  # Add Multi-Location Support

  ## Overview
  This migration adds support for multiple business locations (branches) to the CRM system.

  ## New Tables
  - `locations`
    - `id` (bigint, primary key, auto-increment)
    - `name` (text) - Branch name (e.g., 'Филиал 1', 'Филиал 2')
    - `address` (text) - Physical address of the location
    - `created_at` (timestamptz) - Timestamp when location was created
    - `updated_at` (timestamptz) - Timestamp of last update

  ## Modified Tables
  The following tables now have a `location_id` foreign key:
  - `orders` - Associates orders with specific locations
  - `inventory` - Tracks inventory per location
  - `inventory_movements` - Records stock movements per location
  - `purchase_orders` - Associates purchase orders with locations
  - `clients` - Associates clients with locations (primary branch)
  - `profiles` - Associates users with their assigned location

  ## Data Migration
  - Creates 2 test locations
  - Updates all existing records to reference location_id = 1

  ## Security
  - RLS enabled on locations table
  - Policies allow authenticated users to view all locations
  - Only authenticated users can manage locations
*/

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Users can view all locations"
  ON locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert locations"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update locations"
  ON locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert test locations
INSERT INTO locations (id, name, address) VALUES
  (1, 'Филиал 1', 'ул. Центральная, 15'),
  (2, 'Филиал 2', 'пр. Ленина, 45')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence to ensure future inserts use correct IDs
SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations));

-- Add location_id to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN location_id bigint REFERENCES locations(id);
    UPDATE orders SET location_id = 1 WHERE location_id IS NULL;
    ALTER TABLE orders ALTER COLUMN location_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_location_id ON orders(location_id);
  END IF;
END $$;

-- Add location_id to inventory table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE inventory ADD COLUMN location_id bigint REFERENCES locations(id);
    UPDATE inventory SET location_id = 1 WHERE location_id IS NULL;
    ALTER TABLE inventory ALTER COLUMN location_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);
  END IF;
END $$;

-- Add location_id to inventory_movements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN location_id bigint REFERENCES locations(id);
    UPDATE inventory_movements SET location_id = 1 WHERE location_id IS NULL;
    ALTER TABLE inventory_movements ALTER COLUMN location_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_location_id ON inventory_movements(location_id);
  END IF;
END $$;

-- Add destination_location_id for transfers (optional field)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'destination_location_id'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN destination_location_id bigint REFERENCES locations(id);
  END IF;
END $$;

-- Add location_id to purchase_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN location_id bigint REFERENCES locations(id);
    UPDATE purchase_orders SET location_id = 1 WHERE location_id IS NULL;
    ALTER TABLE purchase_orders ALTER COLUMN location_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_location_id ON purchase_orders(location_id);
  END IF;
END $$;

-- Add location_id to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN location_id bigint REFERENCES locations(id);
    UPDATE clients SET location_id = 1 WHERE location_id IS NULL;
    ALTER TABLE clients ALTER COLUMN location_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_clients_location_id ON clients(location_id);
  END IF;
END $$;

-- Add location_id to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location_id bigint REFERENCES locations(id);
    UPDATE profiles SET location_id = 1 WHERE location_id IS NULL;
    ALTER TABLE profiles ALTER COLUMN location_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_location_id ON profiles(location_id);
  END IF;
END $$;

-- Add comment to movement_type column to document 'transfer' type
COMMENT ON COLUMN inventory_movements.movement_type IS 'Type of movement: income (incoming stock), outcome (outgoing stock), adjustment (manual adjustment), transfer (transfer between locations)';

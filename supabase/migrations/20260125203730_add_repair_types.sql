/*
  # Add Repair Types Table

  1. New Tables
    - `repair_types`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text, not null) - Name of repair type (e.g., "Ekrāna maiņa")
      - `price` (numeric, default 0) - Default price for this repair type
      - `duration_minutes` (integer, default 60) - Estimated duration in minutes
      - `is_active` (boolean, default true) - Whether this repair type is currently offered
      - `created_at` (timestamptz) - Creation timestamp

  2. Changes to Existing Tables
    - Add `repair_type_id` column to `orders` table
    - Add foreign key constraint from orders to repair_types

  3. Security
    - Enable RLS on `repair_types` table
    - Add policy for authenticated users to read all repair types
    - Add policy for authenticated users to insert/update/delete repair types

  4. Initial Data
    - Insert common repair types as examples
*/

-- Create repair_types table
CREATE TABLE IF NOT EXISTS repair_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add repair_type_id to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'repair_type_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN repair_type_id uuid REFERENCES repair_types(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE repair_types ENABLE ROW LEVEL SECURITY;

-- Policies for repair_types
CREATE POLICY "Authenticated users can view all repair types"
  ON repair_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert repair types"
  ON repair_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update repair types"
  ON repair_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete repair types"
  ON repair_types
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert initial repair types (common examples)
INSERT INTO repair_types (name, price, duration_minutes) VALUES
  ('Ekrāna maiņa', 50.00, 60),
  ('Baterijas maiņa', 35.00, 30),
  ('Kameras remonts', 45.00, 90),
  ('Portu tīrīšana', 15.00, 20),
  ('Programmatūras atjaunošana', 25.00, 45),
  ('Diagnostika', 10.00, 30)
ON CONFLICT DO NOTHING;
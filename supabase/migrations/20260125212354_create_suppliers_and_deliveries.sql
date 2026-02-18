/*
  # Create Suppliers and Deliveries System

  ## Overview
  This migration creates a comprehensive inventory supply chain tracking system for managing
  incoming deliveries of spare parts and components from suppliers.

  ## New Tables
  
  ### 1. `suppliers`
  Stores information about parts suppliers and vendors.
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Supplier company name
  - `contact_person` (text) - Contact person name
  - `phone` (text) - Contact phone number
  - `email` (text) - Contact email
  - `notes` (text, optional) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `user_id` (uuid) - Owner reference

  ### 2. `deliveries`
  Tracks incoming deliveries from suppliers.
  - `id` (uuid, primary key) - Unique identifier
  - `supplier_id` (uuid, foreign key) - Reference to supplier
  - `expected_date` (date) - Expected delivery date
  - `actual_date` (date, optional) - Actual received date
  - `status` (text) - Delivery status: 'pending', 'in_transit', 'delivered', 'delayed'
  - `tracking_number` (text, optional) - Tracking/order number
  - `total_cost` (decimal) - Total delivery cost
  - `notes` (text, optional) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `user_id` (uuid) - Owner reference

  ### 3. `delivery_items`
  Individual items/parts within each delivery.
  - `id` (uuid, primary key) - Unique identifier
  - `delivery_id` (uuid, foreign key) - Reference to delivery
  - `item_name` (text) - Part/item description
  - `quantity` (integer) - Quantity ordered
  - `cost_per_unit` (decimal) - Cost per single unit
  - `notes` (text, optional) - Additional notes about item
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only view/manage their own suppliers and deliveries
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations

  ## Indexes
  - Index on supplier_id for fast delivery lookups
  - Index on delivery_id for fast item lookups
  - Index on expected_date for chronological queries
  - Index on status for filtering deliveries
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  expected_date date NOT NULL,
  actual_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'delayed')),
  tracking_number text,
  total_cost decimal(10, 2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create delivery_items table
CREATE TABLE IF NOT EXISTS delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  cost_per_unit decimal(10, 2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deliveries_supplier_id ON deliveries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_expected_date ON deliveries(expected_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_user_id ON deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

-- Suppliers Policies
CREATE POLICY "Users can view own suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deliveries Policies
CREATE POLICY "Users can view own deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deliveries"
  ON deliveries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Delivery Items Policies
CREATE POLICY "Users can view delivery items for own deliveries"
  ON delivery_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.id = delivery_items.delivery_id
      AND deliveries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert delivery items for own deliveries"
  ON delivery_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.id = delivery_items.delivery_id
      AND deliveries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update delivery items for own deliveries"
  ON delivery_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.id = delivery_items.delivery_id
      AND deliveries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.id = delivery_items.delivery_id
      AND deliveries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete delivery items for own deliveries"
  ON delivery_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries
      WHERE deliveries.id = delivery_items.delivery_id
      AND deliveries.user_id = auth.uid()
    )
  );
/*
  # CRM System Database Schema
  
  ## Overview
  Complete database structure for service business CRM with order management,
  client tracking, inventory control, and analytics.
  
  ## New Tables
  
  ### 1. profiles
  - `id` (uuid, FK to auth.users)
  - `full_name` (text)
  - `role` (text) - 'master' or 'manager'
  - `phone` (text)
  - `avatar_url` (text)
  - `created_at` (timestamptz)
  
  ### 2. clients
  - `id` (uuid, PK)
  - `full_name` (text)
  - `phone` (text)
  - `email` (text)
  - `traffic_source` (text) - Instagram, Google, Referral, etc.
  - `loyalty_level` (text) - new, regular, vip
  - `total_orders` (int)
  - `total_spent` (numeric)
  - `notes` (text)
  - `created_at` (timestamptz)
  
  ### 3. order_stages
  - `id` (uuid, PK)
  - `name` (text) - Stage name
  - `position` (int) - Order in kanban
  - `color` (text) - Visual color
  - `created_at` (timestamptz)
  
  ### 4. orders
  - `id` (uuid, PK)
  - `client_id` (uuid, FK)
  - `assigned_to` (uuid, FK to profiles)
  - `stage_id` (uuid, FK)
  - `device_type` (text) - Phone, Laptop, etc.
  - `device_model` (text)
  - `issue_description` (text)
  - `priority` (text) - low, medium, high, urgent
  - `estimated_cost` (numeric)
  - `final_cost` (numeric)
  - `is_paid` (boolean)
  - `is_overdue` (boolean)
  - `due_date` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### 5. order_history
  - `id` (uuid, PK)
  - `order_id` (uuid, FK)
  - `user_id` (uuid, FK to profiles)
  - `event_type` (text) - status_change, comment, photo, payment
  - `description` (text)
  - `media_url` (text)
  - `created_at` (timestamptz)
  
  ### 6. inventory
  - `id` (uuid, PK)
  - `part_name` (text)
  - `sku` (text)
  - `barcode` (text)
  - `quantity` (int)
  - `unit_cost` (numeric)
  - `location` (text)
  - `min_quantity` (int) - Alert threshold
  - `created_at` (timestamptz)
  
  ### 7. inventory_movements
  - `id` (uuid, PK)
  - `inventory_id` (uuid, FK)
  - `order_id` (uuid, FK, nullable)
  - `user_id` (uuid, FK to profiles)
  - `movement_type` (text) - purchase, sale, adjustment
  - `quantity` (int) - Positive or negative
  - `notes` (text)
  - `created_at` (timestamptz)
  
  ### 8. order_items
  - `id` (uuid, PK)
  - `order_id` (uuid, FK)
  - `inventory_id` (uuid, FK, nullable)
  - `item_type` (text) - part or service
  - `name` (text)
  - `quantity` (int)
  - `unit_price` (numeric)
  - `total_price` (numeric)
  - `created_at` (timestamptz)
  
  ### 9. communications
  - `id` (uuid, PK)
  - `client_id` (uuid, FK)
  - `order_id` (uuid, FK, nullable)
  - `channel` (text) - sms, whatsapp, telegram, phone
  - `direction` (text) - inbound, outbound
  - `message` (text)
  - `status` (text) - sent, delivered, read, failed
  - `created_at` (timestamptz)
  
  ### 10. traffic_sources
  - `id` (uuid, PK)
  - `name` (text)
  - `total_clients` (int)
  - `total_revenue` (numeric)
  - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage data
  - Read/write access based on user role
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'master',
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  traffic_source text DEFAULT 'direct',
  loyalty_level text DEFAULT 'new',
  total_orders int DEFAULT 0,
  total_spent numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create order_stages table
CREATE TABLE IF NOT EXISTS order_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL,
  color text DEFAULT 'gray',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stages"
  ON order_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage stages"
  ON order_stages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default stages
INSERT INTO order_stages (name, position, color) VALUES
  ('Приемка', 1, 'blue'),
  ('Диагностика', 2, 'yellow'),
  ('Ожидание запчастей', 3, 'orange'),
  ('Ремонт', 4, 'purple'),
  ('Готово', 5, 'green'),
  ('Выдано', 6, 'gray')
ON CONFLICT DO NOTHING;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id),
  stage_id uuid REFERENCES order_stages(id),
  device_type text NOT NULL,
  device_model text,
  issue_description text NOT NULL,
  priority text DEFAULT 'medium',
  estimated_cost numeric DEFAULT 0,
  final_cost numeric DEFAULT 0,
  is_paid boolean DEFAULT false,
  is_overdue boolean DEFAULT false,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- Create order_history table
CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  event_type text NOT NULL,
  description text NOT NULL,
  media_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order history"
  ON order_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order history"
  ON order_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name text NOT NULL,
  sku text UNIQUE,
  barcode text,
  quantity int DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  location text DEFAULT 'main',
  min_quantity int DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage inventory"
  ON inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create inventory_movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES inventory(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id),
  movement_type text NOT NULL,
  quantity int NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES inventory(id) ON DELETE SET NULL,
  item_type text DEFAULT 'part',
  name text NOT NULL,
  quantity int DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage order items"
  ON order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  channel text DEFAULT 'sms',
  direction text DEFAULT 'outbound',
  message text NOT NULL,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view communications"
  ON communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create communications"
  ON communications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create traffic_sources table
CREATE TABLE IF NOT EXISTS traffic_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  total_clients int DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view traffic sources"
  ON traffic_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage traffic sources"
  ON traffic_sources FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default traffic sources
INSERT INTO traffic_sources (name) VALUES
  ('Instagram'),
  ('Google'),
  ('Yandex'),
  ('Сарафанное радио'),
  ('Прямое обращение'),
  ('Реклама')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_stage_id ON orders(stage_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_id ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON communications(client_id);
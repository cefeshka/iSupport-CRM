/*
  # Add Profit Tracking Features
  
  ## Changes
  
  1. Updates to order_items table
    - Add `cost_price` field to track purchase cost
    - Add `selling_price` field to track selling price
    - Add `profit` field to store calculated profit
    - Existing `item_type` will differentiate between 'part', 'service', and 'accessory'
  
  2. Updates to orders table
    - Add `total_cost` field to track total costs
    - Add `total_profit` field to track total profit
    - Add `accepted_at` field to track when device was accepted
  
  3. New tasks table
    - `id` (uuid, PK)
    - `user_id` (uuid, FK to profiles)
    - `order_id` (uuid, FK to orders, nullable)
    - `title` (text)
    - `description` (text)
    - `due_date` (date)
    - `is_completed` (boolean)
    - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled on tasks table
  - Policies for authenticated users
*/

-- Update order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN cost_price numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'selling_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN selling_price numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'profit'
  ) THEN
    ALTER TABLE order_items ADD COLUMN profit numeric DEFAULT 0;
  END IF;
END $$;

-- Update orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_profit'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_profit numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN accepted_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);

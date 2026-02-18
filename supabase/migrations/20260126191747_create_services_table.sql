/*
  # Create Services Table for Enhanced Order Management

  ## Overview
  This migration creates a comprehensive services table to replace and extend
  the functionality of repair_types. Services will include pricing, duration,
  warranty information, and searchable metadata.

  ## New Tables
  - `services`
    - `id` (uuid, primary key)
    - `name` (text) - Service name (e.g., "Замена экрана")
    - `description` (text, nullable) - Detailed service description
    - `category` (text) - Service category (e.g., "repair", "diagnostics")
    - `price` (numeric) - Service base price
    - `cost` (numeric) - Service cost for profit calculation
    - `duration_minutes` (integer) - Estimated duration in minutes
    - `warranty_months` (integer) - Default warranty period in months
    - `is_active` (boolean) - Whether service is available
    - `search_keywords` (text, nullable) - Additional keywords for search
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on `services` table
  - Add policy for authenticated users to read services
  - Add policy for authenticated users to manage services

  ## Notes
  - Default warranty is 3 months
  - Services are searchable by name, description, and keywords
  - Category helps organize different service types
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'repair',
  price numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  warranty_months integer DEFAULT 3,
  is_active boolean DEFAULT true,
  search_keywords text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

INSERT INTO services (name, description, category, price, cost, duration_minutes, warranty_months, search_keywords) VALUES
  ('Замена экрана', 'Замена поврежденного экрана на оригинальный', 'repair', 120, 80, 60, 3, 'экран дисплей screen display'),
  ('Замена батареи', 'Замена старой батареи на новую оригинальную', 'repair', 80, 50, 45, 6, 'батарея аккумулятор battery'),
  ('Диагностика', 'Полная диагностика устройства', 'diagnostics', 20, 5, 30, 0, 'проверка тест check test'),
  ('Замена камеры', 'Замена передней или задней камеры', 'repair', 90, 60, 45, 3, 'камера фото camera photo'),
  ('Чистка от влаги', 'Профессиональная чистка от попадания жидкости', 'repair', 60, 30, 120, 1, 'вода влага жидкость water liquid'),
  ('Восстановление ПО', 'Переустановка и настройка операционной системы', 'software', 50, 10, 90, 0, 'прошивка софт software firmware');

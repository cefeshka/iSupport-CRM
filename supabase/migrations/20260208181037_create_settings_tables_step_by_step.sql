/*
  # Create Settings Tables Step by Step

  ## Tables
  - company_settings
  - service_catalog  
  - lead_sources
  - inventory_categories
*/

-- Create company_settings
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint REFERENCES locations(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  address text,
  phone text,
  email text,
  registration_number text,
  logo_url text,
  currency text DEFAULT 'EUR',
  tax_rate numeric DEFAULT 21,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_location ON company_settings(location_id);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_select" ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_settings_all" ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create service_catalog
CREATE TABLE IF NOT EXISTS service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint REFERENCES locations(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  standard_price numeric DEFAULT 0,
  duration_minutes integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_location ON service_catalog(location_id);
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_catalog_select" ON service_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_catalog_all" ON service_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create lead_sources
CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_location ON lead_sources(location_id);
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_sources_select" ON lead_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_sources_all" ON lead_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create inventory_categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  critical_stock_level integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_categories_location ON inventory_categories(location_id);
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_categories_select" ON inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_categories_all" ON inventory_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

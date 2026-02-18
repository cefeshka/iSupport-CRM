/*
  # Create Professional Invoices System

  ## Overview
  This migration creates a comprehensive invoice generation system for B2B clients with Latvian standard format support.

  ## 1. New Tables
    - `invoices`
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique invoice identifier)
      - `order_id` (uuid, foreign key to orders)
      - `location_id` (bigint, foreign key to locations)
      - `client_company_name` (text, company name)
      - `client_registration_number` (text, registration number)
      - `client_pvn_number` (text, optional PVN number)
      - `client_legal_address` (text, legal address)
      - `service_type` (text, type of service provided)
      - `service_description` (text, detailed description)
      - `quantity` (integer, always 1 for repairs)
      - `unit_price` (numeric, price per unit)
      - `subtotal` (numeric, amount before VAT)
      - `vat_rate` (numeric, VAT percentage, default 21)
      - `vat_amount` (numeric, calculated VAT amount)
      - `total_amount` (numeric, final amount to pay)
      - `total_in_words` (text, amount in Latvian words)
      - `payment_due_date` (date, payment deadline)
      - `bank_name` (text, company bank name)
      - `bank_iban` (text, company IBAN)
      - `notes` (text, optional notes)
      - `created_by` (uuid, user who created invoice)
      - `created_at` (timestamptz)
      - `issued_date` (date, invoice issue date)

  ## 2. Security
    - Enable RLS on invoices table
    - Only authenticated users can create and view invoices
    - Location-based access control

  ## 3. Indexes
    - Index on order_id for quick lookup
    - Index on invoice_number for search
    - Index on location_id for filtering
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  location_id bigint NOT NULL REFERENCES locations(id),
  
  -- Client information
  client_company_name text NOT NULL,
  client_registration_number text NOT NULL,
  client_pvn_number text,
  client_legal_address text NOT NULL,
  
  -- Service details
  service_type text NOT NULL CHECK (service_type IN ('Telefona remonts', 'Datora remonts', 'Planšetdatora remonts', 'Cits')),
  service_description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  
  -- Financial calculations
  subtotal numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 21,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  total_in_words text,
  
  -- Payment details
  payment_due_date date NOT NULL,
  bank_name text NOT NULL DEFAULT 'Swedbank',
  bank_iban text NOT NULL DEFAULT 'LV12HABA0551234567890',
  
  -- Additional info
  notes text,
  created_by uuid REFERENCES profiles(id),
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices in their location"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE
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

-- Function to auto-calculate invoice financials
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal
  NEW.subtotal := NEW.quantity * NEW.unit_price;
  
  -- Calculate VAT amount
  NEW.vat_amount := NEW.subtotal * (NEW.vat_rate / 100);
  
  -- Calculate total
  NEW.total_amount := NEW.subtotal + NEW.vat_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate totals
DROP TRIGGER IF EXISTS trigger_calculate_invoice_totals ON invoices;
CREATE TRIGGER trigger_calculate_invoice_totals
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- Function to generate unique invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  v_year text;
  v_month text;
  v_sequence int;
  v_invoice_number text;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_month := TO_CHAR(CURRENT_DATE, 'MM');
  
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM '\d+$') AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || v_year || v_month || '%';
  
  -- Format: INV-YYYYMM-XXX (e.g., INV-202602-001)
  v_invoice_number := 'INV-' || v_year || v_month || '-' || LPAD(v_sequence::text, 3, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_location ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_date ON invoices(issued_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Add audit log entry for invoice creation
CREATE OR REPLACE FUNCTION log_invoice_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    new_value,
    metadata,
    location_id
  ) VALUES (
    NEW.created_by,
    'create',
    'invoice',
    NEW.id::text,
    jsonb_build_object(
      'invoice_number', NEW.invoice_number,
      'total_amount', NEW.total_amount,
      'client_company', NEW.client_company_name
    ),
    jsonb_build_object(
      'order_id', NEW.order_id
    ),
    NEW.location_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log invoice creation
DROP TRIGGER IF EXISTS trigger_log_invoice_creation ON invoices;
CREATE TRIGGER trigger_log_invoice_creation
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_creation();

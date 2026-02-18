/*
  # Add Device Identification Fields for Smart Recognition

  1. Changes to `orders` table
    - Add `imei` (text) - International Mobile Equipment Identity for device tracking
    - Add `serial_number` (text) - Device serial number in UPPERCASE format
    - Add `device_color` (text) - Device color for better identification
    - Add indexes for fast lookup by IMEI and serial number

  2. Indexes
    - Create index on `imei` for fast history lookup
    - Create index on `serial_number` for fast history lookup

  3. Security
    - No RLS changes needed (inherits from orders table)

  4. Notes
    - IMEI field will store 15-digit IMEI validated with Luhn algorithm
    - Serial numbers will be stored in UPPERCASE format
    - These fields enable Smart Device Recognition feature
    - Internal history lookup will use these fields to auto-fill device details
*/

-- Add device identification fields to orders table
DO $$
BEGIN
  -- Add IMEI field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'imei'
  ) THEN
    ALTER TABLE orders ADD COLUMN imei text;
  END IF;

  -- Add serial_number field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN serial_number text;
  END IF;

  -- Add device_color field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'device_color'
  ) THEN
    ALTER TABLE orders ADD COLUMN device_color text;
  END IF;
END $$;

-- Create indexes for fast lookup (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_orders_imei ON orders(imei) WHERE imei IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_serial_number ON orders(serial_number) WHERE serial_number IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN orders.imei IS 'Device IMEI (15 digits) for tracking and history lookup';
COMMENT ON COLUMN orders.serial_number IS 'Device serial number (UPPERCASE) for identification';
COMMENT ON COLUMN orders.device_color IS 'Device color for better identification and customer clarity';

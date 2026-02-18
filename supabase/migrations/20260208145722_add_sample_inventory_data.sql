/*
  # Add Sample Inventory Data
  
  ## Overview
  This migration adds sample inventory items for testing the flexible pricing
  and inventory integration features.
  
  ## Changes
  
  ### Sample Inventory Items
  - iPhone screen replacements
  - Samsung parts
  - Laptop components
  - Accessories
  
  ## Notes
  - These are test records and can be modified or deleted
  - Unit costs are set with typical markup potential
*/

-- Insert sample inventory items only if inventory is empty
INSERT INTO inventory (part_name, sku, barcode, quantity, unit_cost, location, min_quantity)
SELECT * FROM (VALUES
  ('iPhone 12 Screen LCD', 'IP12-LCD-001', '4260123456789', 15, 45.00, 'A1', 5),
  ('iPhone 13 Screen OLED', 'IP13-OLED-001', '4260123456790', 10, 65.00, 'A1', 3),
  ('iPhone 11 Battery', 'IP11-BAT-001', '4260123456791', 25, 12.00, 'A2', 10),
  ('Samsung Galaxy S21 Screen', 'SGS21-LCD-001', '4260123456792', 8, 55.00, 'A1', 3),
  ('USB-C Charging Cable', 'ACC-USBC-001', '4260123456793', 50, 2.50, 'B1', 20),
  ('MacBook Air M1 Battery', 'MBA-M1-BAT-001', '4260123456794', 5, 89.00, 'C1', 2),
  ('iPad Pro 11 Screen', 'IPADP11-LCD-001', '4260123456795', 6, 120.00, 'A3', 2),
  ('Laptop RAM DDR4 8GB', 'RAM-DDR4-8GB', '4260123456796', 20, 25.00, 'C2', 10),
  ('Laptop SSD 256GB', 'SSD-256GB-001', '4260123456797', 12, 35.00, 'C2', 5),
  ('Phone Protective Case', 'ACC-CASE-001', '4260123456798', 100, 3.00, 'B2', 30)
) AS new_items(part_name, sku, barcode, quantity, unit_cost, location, min_quantity)
WHERE NOT EXISTS (SELECT 1 FROM inventory LIMIT 1);
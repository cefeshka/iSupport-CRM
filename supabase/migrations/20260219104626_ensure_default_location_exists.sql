/*
  # Ensure Default Location Exists

  1. Purpose
    - Creates a default location if none exists
    - Ensures users can access the system even without manual location setup
  
  2. Changes
    - Inserts default location if locations table is empty
    - Safe to run multiple times (checks for existing locations first)
*/

-- Only insert if no locations exist
INSERT INTO locations (name, address)
SELECT 'Main Office', '123 Main Street'
WHERE NOT EXISTS (SELECT 1 FROM locations LIMIT 1);

-- Log the result
DO $$
DECLARE
  location_count INT;
BEGIN
  SELECT COUNT(*) INTO location_count FROM locations;
  RAISE NOTICE 'Total locations in database: %', location_count;
END $$;

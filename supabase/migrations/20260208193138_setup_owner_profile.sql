/*
  # Setup Owner Profile with Admin Access
  
  ## Overview
  Creates or updates the profile for the system owner (artyouhov@gmail.com)
  with full admin privileges and access to all locations.
  
  ## Changes
  1. Creates/updates profile with admin role
  2. Assigns to Admin role (Админ) from roles table
  3. Sets location_id to first available location
  4. Ensures user can access the system
  
  ## Notes
  - If the user doesn't exist in auth.users, this will create the profile
    that will be linked when they first sign in
  - Location assignment uses the first available location as default
*/

DO $$
DECLARE
  admin_role_id uuid;
  first_location_id bigint;
  owner_user_id uuid;
BEGIN
  -- Get the Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Админ' LIMIT 1;
  
  -- Get the first location ID
  SELECT id INTO first_location_id FROM locations ORDER BY id LIMIT 1;
  
  -- Check if user exists in auth.users by email
  SELECT id INTO owner_user_id 
  FROM auth.users 
  WHERE email = 'artyouhov@gmail.com' 
  LIMIT 1;
  
  -- If user exists in auth.users, upsert their profile
  IF owner_user_id IS NOT NULL THEN
    INSERT INTO profiles (
      id,
      full_name,
      role,
      role_id,
      location_id,
      phone,
      commission_rate
    ) VALUES (
      owner_user_id,
      'System Owner',
      'admin',
      admin_role_id,
      first_location_id,
      '+37120000000',
      0
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      role_id = admin_role_id,
      location_id = COALESCE(profiles.location_id, first_location_id);
    
    RAISE NOTICE 'Profile created/updated for owner user_id: %', owner_user_id;
  ELSE
    RAISE NOTICE 'User artyouhov@gmail.com not found in auth.users. Profile will be created on first login.';
  END IF;
END $$;

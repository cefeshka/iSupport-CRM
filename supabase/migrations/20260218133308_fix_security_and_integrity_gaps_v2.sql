/*
  # Security and Database Integrity Fixes

  ## Critical Issues Found:

  1. **RLS Policies - NO ROLE-BASED ACCESS CONTROL**
     - ALL tables have `USING (true)` policies allowing ALL authenticated users full access
     - Technicians can see/edit ANY order, not just their own
     - No admin role bypass mechanism exists
     - Major security vulnerability!

  2. **Profile Auto-Creation - MISSING**
     - No trigger exists to create profiles when users sign up
     - Manual profile creation required (major UX issue)

  3. **Foreign Key Issues**
     - Several tables use NO ACTION which could cause issues
     - Need proper cascade rules for data integrity

  ## Fixes Applied:

  1. **Create Profile Auto-Sync Trigger**
     - Automatically create profile when user signs up
     - Set default role to 'technician'
     - Location must be set by admin later

  2. **Add Role-Based RLS Policies**
     - Technicians: Can only see/edit orders assigned to them OR in their location
     - Admins: Full access to all data (bypass filters)
     - Use profiles.role to determine access level

  3. **Fix Foreign Key Constraints**
     - Update critical foreign keys to use appropriate cascade rules
     - Prevent orphaned records and data inconsistencies

  4. **Add Helper Functions**
     - `is_admin()` - Check if current user has admin role
     - `get_user_location()` - Get current user's location
     - `get_user_role()` - Get current user's role
*/

-- ============================================================================
-- 1. CREATE PROFILE AUTO-SYNC TRIGGER
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'technician',
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 2. ADD HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's location_id (returns BIGINT to match schema)
CREATE OR REPLACE FUNCTION get_user_location()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT location_id FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. FIX ORDERS TABLE RLS POLICIES (CRITICAL!)
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;

-- SELECT: Admins see all, technicians see only their orders or orders in their location
CREATE POLICY "Orders select policy"
  ON orders FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    assigned_to = auth.uid() OR
    master_id = auth.uid() OR
    location_id = get_user_location()
  );

-- INSERT: All authenticated users can create orders
CREATE POLICY "Orders insert policy"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Admins can update all, technicians can update assigned orders or orders in their location
CREATE POLICY "Orders update policy"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    assigned_to = auth.uid() OR
    master_id = auth.uid() OR
    location_id = get_user_location()
  )
  WITH CHECK (
    is_admin() OR
    assigned_to = auth.uid() OR
    master_id = auth.uid() OR
    location_id = get_user_location()
  );

-- DELETE: Only admins can delete orders
CREATE POLICY "Orders delete policy"
  ON orders FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- 4. FIX PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- SELECT: Admins see all, others see profiles in their location or themselves
CREATE POLICY "Profiles select policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    location_id = get_user_location() OR
    id = auth.uid()
  );

-- UPDATE: Admins update all, users update their own (but not role or location)
CREATE POLICY "Profiles update policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin() OR id = auth.uid())
  WITH CHECK (
    is_admin() OR (
      id = auth.uid() AND
      role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
      COALESCE(location_id, 0) = COALESCE((SELECT location_id FROM profiles WHERE id = auth.uid()), 0)
    )
  );

-- INSERT: Only for admin or system (profile creation happens via trigger)
CREATE POLICY "Profiles insert policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- DELETE: Only admins
CREATE POLICY "Profiles delete policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- 5. FIX TASKS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks they created or are assigned to" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks they created" ON tasks;

-- SELECT: Admins see all, users see tasks assigned to them or in their location
CREATE POLICY "Tasks select policy"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    assigned_to = auth.uid() OR
    user_id = auth.uid() OR
    location_id = get_user_location()
  );

-- INSERT: All authenticated users
CREATE POLICY "Tasks insert policy"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Admins or assigned users
CREATE POLICY "Tasks update policy"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    assigned_to = auth.uid() OR
    user_id = auth.uid()
  )
  WITH CHECK (
    is_admin() OR
    assigned_to = auth.uid() OR
    user_id = auth.uid()
  );

-- DELETE: Admins or task creator
CREATE POLICY "Tasks delete policy"
  ON tasks FOR DELETE
  TO authenticated
  USING (is_admin() OR user_id = auth.uid());

-- ============================================================================
-- 6. FIX INVENTORY TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON inventory;

-- SELECT: Admins see all, others see inventory in their location
CREATE POLICY "Inventory select policy"
  ON inventory FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    location_id = get_user_location()
  );

-- INSERT/UPDATE/DELETE: Admins or users in same location
CREATE POLICY "Inventory insert policy"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR location_id = get_user_location());

CREATE POLICY "Inventory update policy"
  ON inventory FOR UPDATE
  TO authenticated
  USING (is_admin() OR location_id = get_user_location())
  WITH CHECK (is_admin() OR location_id = get_user_location());

CREATE POLICY "Inventory delete policy"
  ON inventory FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- 7. FIX CLIENTS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON clients;

-- SELECT: Admins see all, others see clients in their location
CREATE POLICY "Clients select policy"
  ON clients FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    location_id = get_user_location() OR
    location_id IS NULL
  );

-- INSERT: All authenticated users
CREATE POLICY "Clients insert policy"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Admins or users in same location
CREATE POLICY "Clients update policy"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    location_id = get_user_location() OR
    location_id IS NULL
  )
  WITH CHECK (
    is_admin() OR
    location_id = get_user_location() OR
    location_id IS NULL
  );

-- DELETE: Only admins
CREATE POLICY "Clients delete policy"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- 8. FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Fix clients.location_id (allow SET NULL if location deleted)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_location_id_fkey'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_location_id_fkey;
  END IF;
  
  ALTER TABLE clients 
    ADD CONSTRAINT clients_location_id_fkey 
    FOREIGN KEY (location_id) 
    REFERENCES locations(id) 
    ON DELETE SET NULL;
END $$;

-- Fix profiles.location_id (allow SET NULL if location deleted)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_location_id_fkey'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_location_id_fkey;
  END IF;
  
  ALTER TABLE profiles 
    ADD CONSTRAINT profiles_location_id_fkey 
    FOREIGN KEY (location_id) 
    REFERENCES locations(id) 
    ON DELETE SET NULL;
END $$;

-- Fix inventory.location_id (RESTRICT to prevent accidental deletion)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_location_id_fkey'
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_location_id_fkey;
  END IF;
  
  ALTER TABLE inventory 
    ADD CONSTRAINT inventory_location_id_fkey 
    FOREIGN KEY (location_id) 
    REFERENCES locations(id) 
    ON DELETE RESTRICT;
END $$;

-- Fix orders.location_id (RESTRICT to prevent accidental deletion)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_location_id_fkey'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_location_id_fkey;
  END IF;
  
  ALTER TABLE orders 
    ADD CONSTRAINT orders_location_id_fkey 
    FOREIGN KEY (location_id) 
    REFERENCES locations(id) 
    ON DELETE RESTRICT;
END $$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_location() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION is_admin() IS 'Returns true if current user has admin role';
COMMENT ON FUNCTION get_user_location() IS 'Returns current user location_id (bigint)';
COMMENT ON FUNCTION get_user_role() IS 'Returns current user role';
COMMENT ON FUNCTION handle_new_user() IS 'Auto-creates profile when new user signs up via auth.users trigger';

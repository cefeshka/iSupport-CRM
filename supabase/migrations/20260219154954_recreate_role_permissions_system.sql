/*
  # Recreate Role Permissions System

  1. Drop and recreate `role_permissions` table
  2. Add proper RLS policies
  3. Initialize default permissions for all roles
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Create role_permissions table
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'technician')),
  module text NOT NULL CHECK (module IN ('orders', 'inventory', 'finances', 'settings')),
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, module, action)
);

-- Create index for faster permission lookups
CREATE INDEX idx_role_permissions_lookup 
  ON role_permissions(role, module, action);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Admin and manager can view all permissions
CREATE POLICY "Admin and managers can view all permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );

-- Technicians can view their own role's permissions
CREATE POLICY "Technicians can view own role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    role_permissions.role = 'technician'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'technician'
    )
  );

-- Only admin can modify permissions
CREATE POLICY "Only admin can insert permissions"
  ON role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Only admin can update permissions"
  ON role_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Only admin can delete permissions"
  ON role_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Initialize default permissions for all roles
INSERT INTO role_permissions (role, module, action, allowed) VALUES
  -- Admin: Full access
  ('admin', 'orders', 'create', true),
  ('admin', 'orders', 'edit', true),
  ('admin', 'orders', 'delete', true),
  ('admin', 'orders', 'change_status', true),
  ('admin', 'orders', 'view', true),
  ('admin', 'inventory', 'view', true),
  ('admin', 'inventory', 'add', true),
  ('admin', 'inventory', 'edit', true),
  ('admin', 'inventory', 'delete', true),
  ('admin', 'inventory', 'manage_suppliers', true),
  ('admin', 'finances', 'view_reports', true),
  ('admin', 'finances', 'add_expenses', true),
  ('admin', 'finances', 'delete_transactions', true),
  ('admin', 'settings', 'manage_users', true),
  ('admin', 'settings', 'edit_templates', true),
  ('admin', 'settings', 'manage_locations', true),

  -- Manager: Most access
  ('manager', 'orders', 'create', true),
  ('manager', 'orders', 'edit', true),
  ('manager', 'orders', 'delete', true),
  ('manager', 'orders', 'change_status', true),
  ('manager', 'orders', 'view', true),
  ('manager', 'inventory', 'view', true),
  ('manager', 'inventory', 'add', true),
  ('manager', 'inventory', 'edit', true),
  ('manager', 'inventory', 'delete', false),
  ('manager', 'inventory', 'manage_suppliers', true),
  ('manager', 'finances', 'view_reports', true),
  ('manager', 'finances', 'add_expenses', true),
  ('manager', 'finances', 'delete_transactions', false),
  ('manager', 'settings', 'manage_users', false),
  ('manager', 'settings', 'edit_templates', true),
  ('manager', 'settings', 'manage_locations', false),

  -- Technician: Limited access
  ('technician', 'orders', 'create', true),
  ('technician', 'orders', 'edit', true),
  ('technician', 'orders', 'delete', false),
  ('technician', 'orders', 'change_status', true),
  ('technician', 'orders', 'view', true),
  ('technician', 'inventory', 'view', true),
  ('technician', 'inventory', 'add', false),
  ('technician', 'inventory', 'edit', false),
  ('technician', 'inventory', 'delete', false),
  ('technician', 'inventory', 'manage_suppliers', false),
  ('technician', 'finances', 'view_reports', false),
  ('technician', 'finances', 'add_expenses', false),
  ('technician', 'finances', 'delete_transactions', false),
  ('technician', 'settings', 'manage_users', false),
  ('technician', 'settings', 'edit_templates', false),
  ('technician', 'settings', 'manage_locations', false);
/*
  # Add Advanced RBAC Permissions and Admin Override
  
  ## Overview
  This migration adds critical missing permissions and ensures admins have unrestricted access.
  
  ## New Permissions Added
  1. **Locations Module**
     - `view_locations` - Ability to view and switch between branches
     - `manage_locations` - Ability to create and edit branches
  
  2. **Users Module**
     - `manage_users` - Ability to create and manage user accounts
  
  3. **Settings Module** (expanded)
     - `manage_roles` - Ability to manage roles and permissions
     - `view_audit_log` - Access to system audit logs
  
  ## Admin Override Implementation
  Updates the `has_permission` function to grant admins unconditional access to all features,
  regardless of specific permission assignments.
  
  ## Security Changes
  - Admin role (role='admin' or role.name='Админ') bypasses all permission checks
  - All new permissions are automatically granted to Admin role
  - Lead Master role gets location viewing rights
*/

-- Add new permissions
INSERT INTO permissions (module, action, name, description) VALUES
  ('locations', 'view', 'Просмотр филиалов', 'Возможность просматривать и переключаться между филиалами'),
  ('locations', 'manage', 'Управление филиалами', 'Создание и редактирование филиалов'),
  ('users', 'manage', 'Управление сотрудниками', 'Создание и редактирование учетных записей сотрудников'),
  ('settings', 'manage_roles', 'Управление ролями', 'Настройка ролей и прав доступа'),
  ('settings', 'view_audit_log', 'Просмотр логов', 'Доступ к журналу действий пользователей')
ON CONFLICT (module, action) DO NOTHING;

-- Grant all new permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Админ'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Grant location viewing to Lead Master role
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  true
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Главный мастер'
  AND p.module = 'locations' 
  AND p.action = 'view'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Update has_permission function with Admin Override
CREATE OR REPLACE FUNCTION has_permission(
  user_id uuid,
  module_name text,
  action_name text
) RETURNS boolean AS $$
DECLARE
  user_role text;
  user_role_name text;
BEGIN
  -- Get user's role information
  SELECT p.role, r.name INTO user_role, user_role_name
  FROM profiles p
  LEFT JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;

  -- ADMIN OVERRIDE: Admins have access to everything
  IF user_role = 'admin' OR user_role_name = 'Админ' THEN
    RETURN true;
  END IF;

  -- Check specific permissions for non-admins
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN role_permissions rp ON p.role_id = rp.role_id
    JOIN permissions perm ON rp.permission_id = perm.id
    WHERE p.id = user_id
      AND perm.module = module_name
      AND perm.action = action_name
      AND rp.granted = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

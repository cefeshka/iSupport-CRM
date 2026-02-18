/*
  # Recreate RBAC Tables

  ## Overview
  Drop and recreate RBAC tables with proper structure.
*/

-- Drop existing tables
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Create roles table
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  granted boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create indexes
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_all" ON roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "permissions_select" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_all" ON permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_all" ON role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert permissions
INSERT INTO permissions (module, action, name, description) VALUES
  ('orders', 'create', 'Создание заказов', 'Возможность создавать новые заказы'),
  ('orders', 'read', 'Просмотр заказов', 'Возможность просматривать заказы'),
  ('orders', 'update', 'Редактирование заказов', 'Возможность редактировать заказы'),
  ('orders', 'delete', 'Удаление заказов', 'Возможность удалять заказы'),
  ('orders', 'view_all', 'Просмотр всех заказов', 'Просмотр заказов всех мастеров'),
  ('orders', 'change_price', 'Изменение цен', 'Возможность изменять цены и скидки'),
  ('inventory', 'read', 'Просмотр склада', 'Просмотр складских остатков'),
  ('inventory', 'create', 'Добавление на склад', 'Приемка товара на склад'),
  ('inventory', 'update', 'Редактирование склада', 'Изменение цен и названий товаров'),
  ('inventory', 'delete', 'Удаление со склада', 'Удаление позиций со склада'),
  ('analytics', 'read', 'Доступ к аналитике', 'Просмотр раздела аналитики'),
  ('analytics', 'view_profit', 'Просмотр прибыли', 'Просмотр прибыли и оборота'),
  ('analytics', 'view_all_staff', 'Статистика персонала', 'Просмотр статистики всех мастеров'),
  ('finance', 'read', 'Просмотр финансов', 'Доступ к финансовой информации'),
  ('finance', 'manage_payments', 'Управление оплатами', 'Изменение статусов оплаты'),
  ('finance', 'manage_cash', 'Управление кассой', 'Доступ к кассе и выплатам'),
  ('clients', 'read', 'Просмотр клиентов', 'Просмотр базы клиентов'),
  ('clients', 'create', 'Создание клиентов', 'Добавление новых клиентов'),
  ('clients', 'update', 'Редактирование клиентов', 'Изменение данных клиентов'),
  ('clients', 'delete', 'Удаление клиентов', 'Удаление клиентов из базы'),
  ('settings', 'read', 'Просмотр настроек', 'Доступ к настройкам системы'),
  ('settings', 'manage', 'Управление настройками', 'Изменение настроек системы');

-- Insert roles
INSERT INTO roles (name, description, is_system) VALUES
  ('Админ', 'Полный доступ ко всем функциям системы', true),
  ('Главный мастер', 'Управление заказами и просмотр аналитики', true),
  ('Мастер', 'Работа с заказами и клиентами', true);

-- Grant permissions to Admin (all)
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM roles WHERE name = 'Админ'),
  id,
  true
FROM permissions;

-- Grant permissions to Lead Master
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM roles WHERE name = 'Главный мастер'),
  id,
  true
FROM permissions
WHERE (module = 'orders' AND action IN ('create', 'read', 'update', 'view_all', 'change_price'))
   OR (module = 'inventory' AND action IN ('read', 'create', 'update'))
   OR (module = 'analytics' AND action IN ('read', 'view_profit', 'view_all_staff'))
   OR (module = 'finance' AND action IN ('read', 'manage_payments'))
   OR (module = 'clients')
   OR (module = 'settings' AND action = 'read');

-- Grant permissions to Master
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM roles WHERE name = 'Мастер'),
  id,
  true
FROM permissions
WHERE (module = 'orders' AND action IN ('create', 'read', 'update'))
   OR (module = 'inventory' AND action = 'read')
   OR (module = 'clients' AND action IN ('read', 'create', 'update'));

-- Create permission check function
CREATE OR REPLACE FUNCTION has_permission(
  user_id uuid,
  module_name text,
  action_name text
) RETURNS boolean AS $$
BEGIN
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

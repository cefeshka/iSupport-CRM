/*
  # Create RBAC and Settings Tables

  ## Overview
  This migration creates comprehensive Role-Based Access Control (RBAC) system
  and settings tables for system configuration.

  ## New Tables
  
  ### 1. `roles`
    - `id` (uuid, primary key)
    - `name` (text, unique) - Role name (e.g., "Admin", "Manager", "Master")
    - `display_name` (text) - Human-readable role name
    - `description` (text) - Role description
    - `level` (integer) - Role hierarchy level (higher = more permissions)
    - `is_system` (boolean) - System role that cannot be deleted
    - `created_at` (timestamptz)

  ### 2. `permissions`
    - `id` (uuid, primary key)
    - `name` (text, unique) - Permission name (e.g., "can_view_finance")
    - `display_name` (text) - Human-readable permission name
    - `description` (text) - Permission description
    - `category` (text) - Permission category (e.g., "orders", "finance")
    - `created_at` (timestamptz)

  ### 3. `role_permissions`
    - `id` (uuid, primary key)
    - `role_id` (uuid, foreign key to roles)
    - `permission_id` (uuid, foreign key to permissions)
    - `created_at` (timestamptz)
    - UNIQUE constraint on (role_id, permission_id)

  ### 4. `system_settings`
    - `id` (uuid, primary key)
    - `key` (text, unique) - Setting key
    - `value` (jsonb) - Setting value
    - `category` (text) - Setting category (e.g., "finance", "api")
    - `description` (text) - Setting description
    - `is_public` (boolean) - Whether setting is publicly accessible
    - `updated_at` (timestamptz)
    - `created_at` (timestamptz)

  ### 5. `document_templates`
    - `id` (uuid, primary key)
    - `name` (text) - Template name
    - `template_type` (text) - Template type (e.g., "receipt", "warranty")
    - `content` (text) - HTML template content with placeholders
    - `is_active` (boolean)
    - `created_by` (uuid, foreign key to profiles)
    - `updated_at` (timestamptz)
    - `created_at` (timestamptz)

  ### 6. `api_keys`
    - `id` (uuid, primary key)
    - `service_name` (text) - Service name (e.g., "AfterShip", "ImeiDB")
    - `api_key` (text) - Encrypted API key
    - `is_active` (boolean)
    - `last_used_at` (timestamptz)
    - `created_by` (uuid, foreign key to profiles)
    - `updated_at` (timestamptz)
    - `created_at` (timestamptz)

  ## Updates
  - Add `role_id` to `profiles` table

  ## Security
  - Enable RLS on all tables
  - Add policies based on user roles
  - Restrict access to sensitive data

  ## Initial Data
  - Create default roles: Admin, Manager, Master
  - Create default permissions
  - Link permissions to roles
  - Create default system settings
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  level integer DEFAULT 0,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}',
  category text DEFAULT 'general',
  description text,
  is_public boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  api_key text NOT NULL,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add role_id to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role_id uuid REFERENCES roles(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for permissions
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for role_permissions
CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "Authenticated users can view public settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins can view all settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can manage settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for document_templates
CREATE POLICY "Authenticated users can view templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name IN ('admin', 'manager')
    )
  );

-- RLS Policies for api_keys
CREATE POLICY "Only admins can view api keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can manage api keys"
  ON api_keys FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Insert default roles
INSERT INTO roles (name, display_name, description, level, is_system) VALUES
  ('admin', 'Администратор', 'Полный доступ ко всем функциям системы', 100, true),
  ('manager', 'Менеджер', 'Управление заказами, клиентами и отчетами', 50, true),
  ('master', 'Мастер', 'Работа с заказами и складом без доступа к финансам', 10, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
  ('view_dashboard', 'Просмотр дашборда', 'Доступ к главной панели', 'general'),
  ('view_orders', 'Просмотр заказов', 'Просмотр списка заказов', 'orders'),
  ('create_orders', 'Создание заказов', 'Создание новых заказов', 'orders'),
  ('edit_orders', 'Редактирование заказов', 'Изменение существующих заказов', 'orders'),
  ('delete_orders', 'Удаление заказов', 'Удаление заказов из системы', 'orders'),
  ('view_clients', 'Просмотр клиентов', 'Просмотр базы клиентов', 'clients'),
  ('edit_clients', 'Редактирование клиентов', 'Изменение данных клиентов', 'clients'),
  ('delete_clients', 'Удаление клиентов', 'Удаление клиентов из системы', 'clients'),
  ('view_inventory', 'Просмотр склада', 'Просмотр товаров на складе', 'inventory'),
  ('manage_inventory', 'Управление складом', 'Добавление/изменение товаров', 'inventory'),
  ('view_finance', 'Просмотр финансов', 'Доступ к финансовым отчетам', 'finance'),
  ('view_profit', 'Просмотр прибыли', 'Просмотр данных о прибыли', 'finance'),
  ('manage_payments', 'Управление платежами', 'Прием и возврат платежей', 'finance'),
  ('view_analytics', 'Просмотр аналитики', 'Доступ к аналитическим отчетам', 'analytics'),
  ('manage_users', 'Управление пользователями', 'Добавление/изменение пользователей', 'admin'),
  ('manage_settings', 'Управление настройками', 'Изменение системных настроек', 'admin'),
  ('manage_templates', 'Управление шаблонами', 'Создание/изменение шаблонов документов', 'admin'),
  ('manage_api_keys', 'Управление API ключами', 'Настройка интеграций', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign permissions to Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.name IN (
    'view_dashboard', 'view_orders', 'create_orders', 'edit_orders',
    'view_clients', 'edit_clients', 'view_inventory', 'manage_inventory',
    'view_finance', 'manage_payments', 'view_analytics', 'manage_templates'
  )
ON CONFLICT DO NOTHING;

-- Assign permissions to Master role (no finance/profit access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'master'
  AND p.name IN (
    'view_dashboard', 'view_orders', 'create_orders', 'edit_orders',
    'view_clients', 'view_inventory', 'manage_inventory'
  )
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
  ('currency', '{"code": "EUR", "symbol": "€"}', 'finance', 'Системная валюта', true),
  ('vat_rate', '{"rate": 21, "enabled": true}', 'finance', 'Ставка НДС в процентах', false),
  ('cash_balance', '{"amount": 0}', 'finance', 'Начальный баланс кассы', false),
  ('company_name', '{"name": "iSupport"}', 'general', 'Название компании', true),
  ('company_address', '{"address": ""}', 'general', 'Адрес компании', false),
  ('company_phone', '{"phone": ""}', 'general', 'Телефон компании', true),
  ('company_email', '{"email": ""}', 'general', 'Email компании', true)
ON CONFLICT (key) DO NOTHING;

-- Insert default document templates
INSERT INTO document_templates (name, template_type, content, is_active) VALUES
  ('Квитанция о приемке', 'receipt', 
  '<html><head><style>body{font-family:Arial,sans-serif;padding:20px}</style></head><body><h1>Квитанция о приемке №{{order_number}}</h1><p><strong>Клиент:</strong> {{client_name}}</p><p><strong>Телефон:</strong> {{client_phone}}</p><p><strong>Устройство:</strong> {{device_type}} {{device_model}}</p><p><strong>Проблема:</strong> {{issue_description}}</p><p><strong>Дата приемки:</strong> {{accepted_date}}</p><p><strong>Предварительная стоимость:</strong> {{estimated_cost}}</p><p><strong>Срок выполнения:</strong> {{due_date}}</p></body></html>',
  true),
  ('Гарантийный талон', 'warranty',
  '<html><head><style>body{font-family:Arial,sans-serif;padding:20px}</style></head><body><h1>Гарантийный талон</h1><p><strong>Заказ:</strong> №{{order_number}}</p><p><strong>Клиент:</strong> {{client_name}}</p><p><strong>Устройство:</strong> {{device_type}} {{device_model}}</p><p><strong>Выполненные работы:</strong> {{services}}</p><p><strong>Дата выполнения:</strong> {{completion_date}}</p><p><strong>Гарантия:</strong> {{warranty_period}}</p><p>Гарантия действительна при соблюдении условий эксплуатации.</p></body></html>',
  true)
ON CONFLICT DO NOTHING;

-- Update existing profiles to have admin role
DO $$
DECLARE
  admin_role_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
  
  IF admin_role_id IS NOT NULL THEN
    UPDATE profiles SET role_id = admin_role_id WHERE role_id IS NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_service_name ON api_keys(service_name);

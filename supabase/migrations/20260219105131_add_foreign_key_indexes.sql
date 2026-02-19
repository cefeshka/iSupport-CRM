/*
  # Add Foreign Key Indexes for Performance

  1. Purpose
    - Add indexes for all foreign key columns to improve query performance
    - Prevents full table scans when joining or filtering by foreign keys
  
  2. Changes
    - Creates indexes on all foreign key columns that don't have covering indexes
    - Uses IF NOT EXISTS to ensure idempotency
*/

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Announcement reads indexes
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON announcement_reads(user_id);

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_location_id ON announcements(location_id);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_location_id ON audit_log(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_location_id ON audit_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_location_id ON clients(location_id);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_order_id ON communications(order_id);

-- Document templates indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);

-- Inventory categories indexes
CREATE INDEX IF NOT EXISTS idx_inventory_categories_location_id ON inventory_categories(location_id);

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_destination_location_id ON inventory_movements(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_id ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_location_id ON inventory_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id ON inventory_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_supplier_id ON inventory_movements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON inventory_movements(user_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_location_id ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

-- Order history indexes
CREATE INDEX IF NOT EXISTS idx_order_history_user_id ON order_history(user_id);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_assigned_technician_id ON order_items(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory_id ON order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Order notifications indexes
CREATE INDEX IF NOT EXISTS idx_order_notifications_client_id ON order_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id ON order_notifications(order_id);

-- Order photos indexes
CREATE INDEX IF NOT EXISTS idx_order_photos_order_id ON order_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_order_photos_uploaded_by ON order_photos(uploaded_by);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_master_id ON orders(master_id);
CREATE INDEX IF NOT EXISTS idx_orders_repair_type_id ON orders(repair_type_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_location_id ON profiles(location_id);

-- Purchase order items indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory_id ON purchase_order_items(inventory_id);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_location_id ON purchase_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_received_by ON purchase_orders(received_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- Role permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Stock audit items indexes
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_audit_id ON stock_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_items_inventory_id ON stock_audit_items(inventory_id);

-- Stock audits indexes
CREATE INDEX IF NOT EXISTS idx_stock_audits_completed_by ON stock_audits(completed_by);
CREATE INDEX IF NOT EXISTS idx_stock_audits_location_id ON stock_audits(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_audits_started_by ON stock_audits(started_by);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);

/*
  # Remove Duplicate RLS Policies

  1. Purpose
    - Remove duplicate permissive policies that cause security warnings
    - Keep only the most specific and secure policy for each action
  
  2. Changes
    - Drops duplicate policies across multiple tables
    - Retains the more secure or specific policy in each case
*/

-- Announcements: Keep announcements_select_all (location-based), drop announcements_select
DROP POLICY IF EXISTS "announcements_select" ON announcements;

-- Communications: Keep the newer policy, drop the old one
DROP POLICY IF EXISTS "communications_insert" ON communications;

-- Device brands: Keep staff-specific policies, drop generic ones
DROP POLICY IF EXISTS "device_brands_insert" ON device_brands;
DROP POLICY IF EXISTS "device_brands_select" ON device_brands;

-- Device models: Keep staff-specific policies, drop generic ones
DROP POLICY IF EXISTS "device_models_insert" ON device_models;
DROP POLICY IF EXISTS "device_models_select" ON device_models;

-- Invoices: Keep staff-specific policy
DROP POLICY IF EXISTS "invoices_update" ON invoices;

-- Locations: Keep owner-specific policy
DROP POLICY IF EXISTS "locations_delete" ON locations;

-- Order notifications: Keep the newer named policies
DROP POLICY IF EXISTS "order_notifications_insert" ON order_notifications;
DROP POLICY IF EXISTS "order_notifications_update" ON order_notifications;

-- Order photos: Keep the newer named policies
DROP POLICY IF EXISTS "order_photos_delete" ON order_photos;
DROP POLICY IF EXISTS "order_photos_insert" ON order_photos;

-- Suppliers: Keep staff-specific policies
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;

-- Tasks: Keep the specific assigned/admin policy
DROP POLICY IF EXISTS "tasks_update" ON tasks;

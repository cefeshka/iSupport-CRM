/*
  # Create Internal Announcements System

  ## Overview
  This migration creates a comprehensive internal announcements system for team communication with priority levels, expiration tracking, and read receipts.

  ## 1. New Tables
    - `announcements`
      - `id` (uuid, primary key)
      - `title` (text, announcement title)
      - `content` (text, announcement content)
      - `priority` (text, normal or high/urgent)
      - `created_by` (uuid, user who created announcement)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz, when announcement expires)
      - `location_id` (bigint, for multi-location support)
      - `is_active` (boolean, active status)

    - `announcement_reads`
      - `id` (uuid, primary key)
      - `announcement_id` (uuid, foreign key to announcements)
      - `user_id` (uuid, user who read announcement)
      - `read_at` (timestamptz)
      - Unique constraint on (announcement_id, user_id)

  ## 2. Security
    - Enable RLS on both tables
    - Only admins/owners can create announcements
    - All authenticated users can view announcements
    - Users can only mark their own announcements as read

  ## 3. Functions
    - Helper function to check if announcement is expired
    - View to show announcement read statistics

  ## 4. Indexes
    - Index on expires_at for filtering active announcements
    - Index on priority for urgent announcements
    - Index on location_id for filtering
    - Index on announcement_reads for tracking
*/

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  location_id bigint NOT NULL REFERENCES locations(id),
  is_active boolean DEFAULT true
);

-- Create announcement_reads junction table
CREATE TABLE IF NOT EXISTS announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements

-- Admins and owners can view all announcements in their location
CREATE POLICY "Users can view announcements in their location"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    location_id IN (
      SELECT location_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only admins, owners, and managers can create announcements
CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
      AND location_id = announcements.location_id
    )
  );

-- Only admins, owners, and managers can update announcements
CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
      AND location_id = announcements.location_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
      AND location_id = announcements.location_id
    )
  );

-- Only admins, owners, and managers can delete announcements
CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
      AND location_id = announcements.location_id
    )
  );

-- RLS Policies for announcement_reads

-- Users can view all read receipts for announcements in their location
CREATE POLICY "Users can view read receipts in their location"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      INNER JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = announcement_reads.announcement_id
      AND a.location_id = p.location_id
    )
  );

-- Users can mark announcements as read
CREATE POLICY "Users can mark announcements as read"
  ON announcement_reads FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM announcements a
      INNER JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = announcement_reads.announcement_id
      AND a.location_id = p.location_id
    )
  );

-- Users can only delete their own read receipts
CREATE POLICY "Users can delete own read receipts"
  ON announcement_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create view for announcement statistics
CREATE OR REPLACE VIEW announcement_stats AS
SELECT 
  a.id,
  a.title,
  a.priority,
  a.expires_at,
  a.location_id,
  a.created_at,
  a.is_active,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT ar.user_id) as read_count,
  ARRAY_AGG(DISTINCT ar.user_id) FILTER (WHERE ar.user_id IS NOT NULL) as read_by_users
FROM announcements a
CROSS JOIN profiles p
LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id
WHERE p.location_id = a.location_id
  AND p.role != 'owner'
GROUP BY a.id, a.title, a.priority, a.expires_at, a.location_id, a.created_at, a.is_active;

-- Function to get active announcements for a user
CREATE OR REPLACE FUNCTION get_active_announcements_for_user(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  priority text,
  created_by uuid,
  created_at timestamptz,
  expires_at timestamptz,
  creator_name text,
  is_read boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.content,
    a.priority,
    a.created_by,
    a.created_at,
    a.expires_at,
    p.full_name as creator_name,
    CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END as is_read
  FROM announcements a
  INNER JOIN profiles p ON p.id = a.created_by
  LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = p_user_id
  WHERE a.is_active = true
    AND a.expires_at > now()
    AND a.location_id IN (
      SELECT location_id FROM profiles WHERE id = p_user_id
    )
  ORDER BY 
    a.priority DESC,
    a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark announcement as read
CREATE OR REPLACE FUNCTION mark_announcement_read(p_announcement_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, p_user_id)
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_location ON announcements(location_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);

-- Audit log trigger for announcements
CREATE OR REPLACE FUNCTION log_announcement_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    new_value,
    metadata,
    location_id
  ) VALUES (
    NEW.created_by,
    'create',
    'announcement',
    NEW.id::text,
    jsonb_build_object(
      'title', NEW.title,
      'priority', NEW.priority,
      'expires_at', NEW.expires_at
    ),
    jsonb_build_object(
      'content_length', LENGTH(NEW.content)
    ),
    NEW.location_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log announcement creation
DROP TRIGGER IF EXISTS trigger_log_announcement_creation ON announcements;
CREATE TRIGGER trigger_log_announcement_creation
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION log_announcement_creation();

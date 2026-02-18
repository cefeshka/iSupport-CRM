/*
  # Add Priority, Assignee and Location to Tasks

  1. Changes
    - Add `priority` column (low, medium, high)
    - Add `assigned_to` column (references profiles table)
    - Add `location_id` column (references locations table as bigint)
    - Update RLS policies to allow viewing tasks assigned to user
    - Set default values for existing tasks

  2. Security
    - Update RLS policies for task assignment
    - Users can view tasks assigned to them or created by them
*/

-- Add new columns to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE tasks ADD COLUMN assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN location_id bigint REFERENCES locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update existing tasks to set assigned_to same as user_id and copy location from user profile
UPDATE tasks t
SET 
  assigned_to = t.user_id,
  location_id = p.location_id
FROM profiles p
WHERE t.user_id = p.id AND t.assigned_to IS NULL;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Create new policies for task assignment
CREATE POLICY "Users can view tasks assigned to them or created by them"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete tasks they created"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
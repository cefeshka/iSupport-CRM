/*
  # Add Time Field to Tasks

  ## Changes
  
  1. Updates to tasks table
    - Add `due_time` field (time) to store the time when task should be completed
  
  ## Notes
  - Tasks can now have both date and time for more precise scheduling
  - Time field is optional (nullable) for backward compatibility
*/

-- Add due_time field to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'due_time'
  ) THEN
    ALTER TABLE tasks ADD COLUMN due_time time;
  END IF;
END $$;
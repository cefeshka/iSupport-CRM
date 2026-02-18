/*
  # Update Order Stages (Safe)

  ## Changes
  Updates the default order stages to match the business workflow:
  1. Новый - Default status for new orders (blue)
  2. Ждет запчасть - Waiting for parts (orange)
  3. В работе - Work in progress (purple)
  4. Готов (Сообщили) - Ready and customer notified (green)
  5. Закрыт - Closed/Completed (gray)

  ## Notes
  - Updates existing stages instead of deleting them
  - Maintains referential integrity with existing orders
  - Adds missing stages if needed
*/

-- Update existing stages (using position to identify them)
DO $$
DECLARE
  stage_1 uuid;
  stage_2 uuid;
  stage_3 uuid;
  stage_4 uuid;
  stage_5 uuid;
  stage_6 uuid;
BEGIN
  -- Get existing stages by position
  SELECT id INTO stage_1 FROM order_stages WHERE position = 1 LIMIT 1;
  SELECT id INTO stage_2 FROM order_stages WHERE position = 2 LIMIT 1;
  SELECT id INTO stage_3 FROM order_stages WHERE position = 3 LIMIT 1;
  SELECT id INTO stage_4 FROM order_stages WHERE position = 4 LIMIT 1;
  SELECT id INTO stage_5 FROM order_stages WHERE position = 5 LIMIT 1;
  SELECT id INTO stage_6 FROM order_stages WHERE position = 6 LIMIT 1;

  -- Update existing stages
  IF stage_1 IS NOT NULL THEN
    UPDATE order_stages SET name = 'Новый', color = 'blue' WHERE id = stage_1;
  ELSE
    INSERT INTO order_stages (name, position, color) VALUES ('Новый', 1, 'blue');
  END IF;

  IF stage_2 IS NOT NULL THEN
    UPDATE order_stages SET name = 'Ждет запчасть', color = 'orange' WHERE id = stage_2;
  ELSE
    INSERT INTO order_stages (name, position, color) VALUES ('Ждет запчасть', 2, 'orange');
  END IF;

  IF stage_3 IS NOT NULL THEN
    UPDATE order_stages SET name = 'В работе', color = 'purple' WHERE id = stage_3;
  ELSE
    INSERT INTO order_stages (name, position, color) VALUES ('В работе', 3, 'purple');
  END IF;

  IF stage_4 IS NOT NULL THEN
    UPDATE order_stages SET name = 'Готов (Сообщили)', color = 'green' WHERE id = stage_4;
  ELSE
    INSERT INTO order_stages (name, position, color) VALUES ('Готов (Сообщили)', 4, 'green');
  END IF;

  IF stage_5 IS NOT NULL THEN
    UPDATE order_stages SET name = 'Закрыт', color = 'gray' WHERE id = stage_5;
  ELSE
    INSERT INTO order_stages (name, position, color) VALUES ('Закрыт', 5, 'gray');
  END IF;

  -- Delete stage 6 if it exists (we only need 5 stages)
  IF stage_6 IS NOT NULL THEN
    -- First, reassign any orders from stage 6 to stage 5 (Закрыт)
    UPDATE orders SET stage_id = stage_5 WHERE stage_id = stage_6;
    -- Then delete the stage
    DELETE FROM order_stages WHERE id = stage_6;
  END IF;
END $$;

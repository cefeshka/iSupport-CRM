/*
  # Add Inventory Stock Management
  
  ## Overview
  This migration adds automatic inventory stock management that updates
  stock levels when parts are used in orders.
  
  ## Changes
  
  ### 1. Order Items Enhancement
  - `stock_reserved`: Boolean flag to track if inventory was already reserved/deducted
  
  ### 2. Inventory Movement Tracking
  Automatic creation of inventory_movements records when:
  - A part is added to an order in "In Progress" or "Completed" status
  - A part is removed from an order (stock returned)
  
  ### 3. Functions
  - `reserve_inventory_stock()`: Deducts stock when part is used in order
  - `return_inventory_stock()`: Returns stock when part is removed from order
  - `handle_order_item_stock()`: Trigger function to manage stock changes
  
  ### 4. Safety
  - Prevents double deduction with stock_reserved flag
  - Only processes items with inventory_id (parts from stock)
  - Creates audit trail in inventory_movements table
*/

-- Add stock_reserved column to order_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'stock_reserved'
  ) THEN
    ALTER TABLE order_items ADD COLUMN stock_reserved boolean DEFAULT false;
  END IF;
END $$;

-- Function to reserve (deduct) inventory stock
CREATE OR REPLACE FUNCTION reserve_inventory_stock(
  p_order_item_id uuid,
  p_inventory_id uuid,
  p_quantity integer,
  p_order_id uuid
) RETURNS void AS $$
BEGIN
  -- Deduct from inventory
  UPDATE inventory
  SET quantity = quantity - p_quantity
  WHERE id = p_inventory_id;
  
  -- Mark as reserved
  UPDATE order_items
  SET stock_reserved = true
  WHERE id = p_order_item_id;
  
  -- Create movement record
  INSERT INTO inventory_movements (
    inventory_id,
    order_id,
    user_id,
    movement_type,
    quantity,
    notes
  ) VALUES (
    p_inventory_id,
    p_order_id,
    auth.uid(),
    'sale',
    -p_quantity,
    'Stock reserved for order item'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to return inventory stock
CREATE OR REPLACE FUNCTION return_inventory_stock(
  p_inventory_id uuid,
  p_quantity integer,
  p_order_id uuid
) RETURNS void AS $$
BEGIN
  -- Return to inventory
  UPDATE inventory
  SET quantity = quantity + p_quantity
  WHERE id = p_inventory_id;
  
  -- Create movement record
  INSERT INTO inventory_movements (
    inventory_id,
    order_id,
    user_id,
    movement_type,
    quantity,
    notes
  ) VALUES (
    p_inventory_id,
    p_order_id,
    auth.uid(),
    'adjustment',
    p_quantity,
    'Stock returned from removed order item'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle order item stock changes
CREATE OR REPLACE FUNCTION handle_order_item_stock()
RETURNS TRIGGER AS $$
DECLARE
  order_stage_name text;
BEGIN
  -- Handle INSERT: Reserve stock if order is in progress or completed
  IF TG_OP = 'INSERT' THEN
    -- Only process items linked to inventory (parts)
    IF NEW.inventory_id IS NOT NULL AND NEW.stock_reserved = false THEN
      -- Get order stage
      SELECT s.name INTO order_stage_name
      FROM orders o
      JOIN order_stages s ON s.id = o.stage_id
      WHERE o.id = NEW.order_id;
      
      -- Reserve stock if order is in appropriate stage
      IF order_stage_name IN ('В работе', 'In Progress', 'Закрыт', 'Completed') THEN
        PERFORM reserve_inventory_stock(
          NEW.id,
          NEW.inventory_id,
          NEW.quantity,
          NEW.order_id
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE: Reserve/return stock based on changes
  IF TG_OP = 'UPDATE' THEN
    -- If inventory_id changed or quantity changed, handle stock
    IF OLD.inventory_id IS DISTINCT FROM NEW.inventory_id 
       OR OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      
      -- Return old stock if it was reserved
      IF OLD.inventory_id IS NOT NULL AND OLD.stock_reserved = true THEN
        PERFORM return_inventory_stock(
          OLD.inventory_id,
          OLD.quantity,
          OLD.order_id
        );
        
        -- Mark as not reserved since we're returning it
        NEW.stock_reserved := false;
      END IF;
      
      -- Reserve new stock if applicable
      IF NEW.inventory_id IS NOT NULL AND NEW.stock_reserved = false THEN
        SELECT s.name INTO order_stage_name
        FROM orders o
        JOIN order_stages s ON s.id = o.stage_id
        WHERE o.id = NEW.order_id;
        
        IF order_stage_name IN ('В работе', 'In Progress', 'Закрыт', 'Completed') THEN
          PERFORM reserve_inventory_stock(
            NEW.id,
            NEW.inventory_id,
            NEW.quantity,
            NEW.order_id
          );
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE: Return stock if it was reserved
  IF TG_OP = 'DELETE' THEN
    IF OLD.inventory_id IS NOT NULL AND OLD.stock_reserved = true THEN
      PERFORM return_inventory_stock(
        OLD.inventory_id,
        OLD.quantity,
        OLD.order_id
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_order_item_stock_trigger ON order_items;

-- Create trigger for order item stock management
CREATE TRIGGER handle_order_item_stock_trigger
BEFORE INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION handle_order_item_stock();

-- Function to handle order stage changes and reserve stock
CREATE OR REPLACE FUNCTION handle_order_stage_stock()
RETURNS TRIGGER AS $$
DECLARE
  new_stage_name text;
  old_stage_name text;
  item record;
BEGIN
  -- Get stage names
  SELECT name INTO new_stage_name FROM order_stages WHERE id = NEW.stage_id;
  IF OLD.stage_id IS NOT NULL THEN
    SELECT name INTO old_stage_name FROM order_stages WHERE id = OLD.stage_id;
  END IF;
  
  -- If moving to "In Progress" or "Completed", reserve stock for unreserved items
  IF new_stage_name IN ('В работе', 'In Progress', 'Закрыт', 'Completed') 
     AND (old_stage_name IS NULL OR old_stage_name NOT IN ('В работе', 'In Progress', 'Закрыт', 'Completed')) THEN
    
    -- Reserve stock for all unreserved items
    FOR item IN 
      SELECT id, inventory_id, quantity, order_id
      FROM order_items
      WHERE order_id = NEW.id 
        AND inventory_id IS NOT NULL 
        AND stock_reserved = false
    LOOP
      PERFORM reserve_inventory_stock(
        item.id,
        item.inventory_id,
        item.quantity,
        item.order_id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_order_stage_stock_trigger ON orders;

-- Create trigger for order stage changes
CREATE TRIGGER handle_order_stage_stock_trigger
AFTER UPDATE OF stage_id ON orders
FOR EACH ROW
WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
EXECUTE FUNCTION handle_order_stage_stock();
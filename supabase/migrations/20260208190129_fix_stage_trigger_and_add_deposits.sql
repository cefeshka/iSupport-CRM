/*
  # Fix Stage Trigger and Add Deposit System

  ## Overview
  Fixes the order status change trigger and adds prepayment/deposit tracking.

  ## Changes
  
  ### Bug Fixes
  - Fix log_order_status_change trigger to use correct column name (stage_id instead of current_stage)
  
  ### New Features
  - `prepayment` (numeric) - Deposit/prepayment amount from client
  - `waiting_for_parts` (boolean) - Flag for orders waiting for parts delivery
  - Automatic balance_due calculation including prepayments
  - Activity logging for deposits and part waiting status

  ## Security
  - Existing RLS policies apply to new fields
*/

-- First, fix the existing trigger function for order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    PERFORM log_activity(
      auth.uid(),
      'order',
      NEW.id::text,
      'status_changed',
      'Статус изменен',
      jsonb_build_object('stage_id', OLD.stage_id),
      jsonb_build_object('stage_id', NEW.stage_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now add prepayment field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'prepayment'
  ) THEN
    ALTER TABLE orders ADD COLUMN prepayment numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add waiting_for_parts flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'waiting_for_parts'
  ) THEN
    ALTER TABLE orders ADD COLUMN waiting_for_parts boolean DEFAULT false;
  END IF;
END $$;

-- Add index for filtering orders waiting for parts
CREATE INDEX IF NOT EXISTS idx_orders_waiting_for_parts ON orders(waiting_for_parts) WHERE waiting_for_parts = true;

-- Create trigger function to update balance_due when prepayment changes
CREATE OR REPLACE FUNCTION update_balance_due()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_due = GREATEST(
    COALESCE(NEW.final_cost, NEW.estimated_cost, 0) - COALESCE(NEW.prepayment, 0),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance_due calculation
DROP TRIGGER IF EXISTS trigger_update_balance_due ON orders;
CREATE TRIGGER trigger_update_balance_due
  BEFORE INSERT OR UPDATE OF final_cost, estimated_cost, prepayment ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_due();

-- Create trigger function to log prepayment changes
CREATE OR REPLACE FUNCTION log_prepayment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.prepayment > 0) THEN
    PERFORM log_activity(
      auth.uid(),
      'order',
      NEW.id::text,
      'prepayment_added',
      'Внесен депозит: €' || NEW.prepayment,
      NULL,
      jsonb_build_object('amount', NEW.prepayment)
    );
  END IF;
  
  IF (TG_OP = 'UPDATE' AND OLD.prepayment IS DISTINCT FROM NEW.prepayment AND NEW.prepayment > OLD.prepayment) THEN
    PERFORM log_activity(
      auth.uid(),
      'order',
      NEW.id::text,
      'prepayment_added',
      'Депозит увеличен с €' || OLD.prepayment || ' до €' || NEW.prepayment,
      jsonb_build_object('amount', OLD.prepayment),
      jsonb_build_object('amount', NEW.prepayment)
    );
  END IF;
  
  IF (TG_OP = 'UPDATE' AND OLD.waiting_for_parts IS DISTINCT FROM NEW.waiting_for_parts AND NEW.waiting_for_parts = true) THEN
    PERFORM log_activity(
      auth.uid(),
      'order',
      NEW.id::text,
      'waiting_for_parts',
      'Заказ ожидает поставку запчастей',
      jsonb_build_object('waiting', OLD.waiting_for_parts),
      jsonb_build_object('waiting', NEW.waiting_for_parts)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for prepayment logging
DROP TRIGGER IF EXISTS trigger_log_prepayment ON orders;
CREATE TRIGGER trigger_log_prepayment
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_prepayment_change();

-- Update existing orders to recalculate balance_due
UPDATE orders 
SET balance_due = GREATEST(
  COALESCE(final_cost, estimated_cost, 0) - COALESCE(prepayment, 0),
  0
);

-- Add helpful comments
COMMENT ON COLUMN orders.prepayment IS 'Deposit/prepayment amount from client';
COMMENT ON COLUMN orders.waiting_for_parts IS 'Flag indicating order is waiting for parts delivery';

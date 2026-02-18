/*
  # Create Technician Performance Function

  1. New Functions
    - `get_technician_performance(target_month)` - Returns monthly performance data for technicians
      - Calculates total labor revenue (service price only, excluding parts)
      - Tracks progress towards 6000 EUR monthly quota
      - Calculates 25% bonus on amount exceeding quota
      - Only includes closed orders for the current technician

  2. Return Values
    - `total_labor_revenue` (numeric) - Total service/labor revenue for the month
    - `quota` (numeric) - Monthly target (6000 EUR)
    - `remaining_to_plan` (numeric) - Amount remaining to reach quota
    - `bonus_amount` (numeric) - 25% of revenue exceeding quota
    - `percent_complete` (numeric) - Progress percentage towards quota
    - `plan_reached` (boolean) - Whether quota has been met

  3. Security
    - Function uses auth.uid() to ensure technicians only see their own data
    - Respects existing RLS policies
*/

CREATE OR REPLACE FUNCTION get_technician_performance(target_month timestamptz)
RETURNS TABLE (
  total_labor_revenue numeric,
  quota numeric,
  remaining_to_plan numeric,
  bonus_amount numeric,
  percent_complete numeric,
  plan_reached boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  month_start timestamptz;
  month_end timestamptz;
  closed_stage_id uuid;
  labor_sum numeric;
  quota_amount numeric := 6000;
BEGIN
  -- Calculate month boundaries
  month_start := date_trunc('month', target_month);
  month_end := date_trunc('month', target_month) + interval '1 month' - interval '1 second';

  -- Get closed stage ID
  SELECT id INTO closed_stage_id
  FROM order_stages
  WHERE name = 'Закрыт'
  LIMIT 1;

  -- Calculate total labor revenue for the technician
  -- Use service_price if available, otherwise calculate (final_cost - parts_cost_total)
  SELECT COALESCE(SUM(
    CASE 
      WHEN o.service_price > 0 THEN o.service_price
      ELSE GREATEST(0, COALESCE(o.final_cost, 0) - COALESCE(o.parts_cost_total, 0))
    END
  ), 0) INTO labor_sum
  FROM orders o
  WHERE o.assigned_to = auth.uid()
    AND o.stage_id = closed_stage_id
    AND o.completed_at >= month_start
    AND o.completed_at <= month_end
    AND o.completed_at IS NOT NULL;

  -- Return calculated values
  RETURN QUERY SELECT
    ROUND(labor_sum, 2) as total_labor_revenue,
    quota_amount as quota,
    ROUND(GREATEST(0, quota_amount - labor_sum), 2) as remaining_to_plan,
    ROUND(CASE WHEN labor_sum > quota_amount THEN (labor_sum - quota_amount) * 0.25 ELSE 0 END, 2) as bonus_amount,
    ROUND(LEAST(100, (labor_sum / quota_amount) * 100), 2) as percent_complete,
    (labor_sum >= quota_amount) as plan_reached;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_technician_performance(timestamptz) TO authenticated;

COMMENT ON FUNCTION get_technician_performance IS 'Calculates monthly performance metrics for technicians including labor revenue, quota progress, and bonus calculations';

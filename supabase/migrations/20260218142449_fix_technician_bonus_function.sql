/*
  # Fix Technician Bonus Calculation Function
  
  Updates the function to use correct column names:
  - technician_id -> assigned_technician_id
  - total_profit -> profit (and multiply by quantity for total)
*/

DROP FUNCTION IF EXISTS get_technician_bonuses(date, uuid);

CREATE OR REPLACE FUNCTION get_technician_bonuses(
  target_month date DEFAULT CURRENT_DATE,
  target_location_id uuid DEFAULT NULL
)
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  total_labor numeric,
  bonus_amount numeric,
  status text,
  quota_progress numeric
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  month_start date;
  month_end date;
  quota_threshold numeric := 6000;
  bonus_rate numeric := 0.25;
BEGIN
  month_start := date_trunc('month', target_month)::date;
  month_end := (date_trunc('month', target_month) + interval '1 month' - interval '1 day')::date;
  
  RETURN QUERY
  SELECT 
    p.id as technician_id,
    COALESCE(p.full_name, p.email) as technician_name,
    COALESCE(SUM(oi.profit * oi.quantity), 0) as total_labor,
    CASE 
      WHEN COALESCE(SUM(oi.profit * oi.quantity), 0) > quota_threshold 
      THEN (COALESCE(SUM(oi.profit * oi.quantity), 0) - quota_threshold) * bonus_rate
      ELSE 0
    END as bonus_amount,
    CASE 
      WHEN COALESCE(SUM(oi.profit * oi.quantity), 0) >= quota_threshold THEN 'Quota Reached'
      WHEN COALESCE(SUM(oi.profit * oi.quantity), 0) > 0 THEN 'Active'
      ELSE 'No Activity'
    END as status,
    CASE 
      WHEN quota_threshold > 0 THEN (COALESCE(SUM(oi.profit * oi.quantity), 0) / quota_threshold * 100)
      ELSE 0
    END as quota_progress
  FROM profiles p
  LEFT JOIN order_items oi ON oi.assigned_technician_id = p.id 
    AND oi.item_type = 'labor'
  LEFT JOIN orders o ON o.id = oi.order_id
  WHERE 
    p.role IN ('technician', 'admin', 'owner')
    AND (target_location_id IS NULL OR o.location_id = target_location_id OR o.location_id IS NULL)
    AND (
      (oi.id IS NULL) OR 
      (o.created_at >= month_start AND o.created_at <= month_end)
    )
  GROUP BY p.id, p.full_name, p.email
  ORDER BY total_labor DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_technician_bonuses TO authenticated;

COMMENT ON FUNCTION get_technician_bonuses IS 'Calculates technician bonuses based on monthly labor revenue. Quota: €6000, Bonus Rate: 25% of revenue above quota. Only counts labor items.';

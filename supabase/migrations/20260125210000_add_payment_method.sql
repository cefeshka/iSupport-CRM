/*
  # Add Payment Method to Orders

  1. Changes
    - Add `payment_method` column to `orders` table
      - Values: 'bank', 'cash', 'bs_cash' (Банк/терминал, Касса, БС Касса)
      - Default: null (not paid yet)

  2. Notes
    - This field tracks how the payment was received when order is marked as paid
    - Used for financial reporting and cash register tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
  END IF;
END $$;

-- Add function to get waiting list count for products
CREATE OR REPLACE FUNCTION get_product_waiting_list_count(product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM notifications
    WHERE 
      product_id = $1 
      AND notification_type = 'back_in_stock'
      AND is_sent = false
  );
END;
$$;

-- Add computed column for waiting list count
ALTER TABLE products DROP COLUMN IF EXISTS waiting_list_count;
ALTER TABLE products 
ADD COLUMN waiting_list_count INTEGER GENERATED ALWAYS AS (
  (SELECT get_product_waiting_list_count(id))
) STORED;
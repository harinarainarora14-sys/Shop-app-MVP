-- Fix the notification functions to properly handle UUID types

-- Function to create shop opened notifications (FIXED)
CREATE OR REPLACE FUNCTION public.notify_shop_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when shop goes from closed to open
  IF OLD.is_open = false AND NEW.is_open = true THEN
    -- Fixed product_id to be properly cast as NULL::UUID instead of NULL
    INSERT INTO public.notifications (user_id, shop_id, product_id, type, title, message)
    SELECT DISTINCT
      bir.user_id,
      NEW.id,
      NULL::UUID,  -- Explicitly cast NULL as UUID type
      'shop_opened',
      'Shop is Now Open!',
      NEW.name || ' has opened and your requested items might be available'
    FROM public.back_in_stock_requests bir
    JOIN public.products p ON p.id = bir.product_id
    WHERE p.shop_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger to use the fixed function
DROP TRIGGER IF EXISTS shop_opened_notification ON public.shops;
CREATE TRIGGER shop_opened_notification
  AFTER UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_shop_opened();

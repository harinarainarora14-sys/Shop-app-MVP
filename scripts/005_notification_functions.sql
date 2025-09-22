-- Function to create back-in-stock notifications
CREATE OR REPLACE FUNCTION public.notify_back_in_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when stock goes from 0 to > 0
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    -- Create notifications for all users who requested this product
    INSERT INTO public.notifications (user_id, shop_id, product_id, type, title, message)
    SELECT 
      bir.user_id,
      NEW.shop_id,
      NEW.id,
      'back_in_stock',
      'Item Back in Stock!',
      NEW.name || ' is now available at ' || s.name
    FROM public.back_in_stock_requests bir
    JOIN public.shops s ON s.id = NEW.shop_id
    WHERE bir.product_id = NEW.id;
    
    -- Remove the fulfilled requests
    DELETE FROM public.back_in_stock_requests 
    WHERE product_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create shop opened notifications
CREATE OR REPLACE FUNCTION public.notify_shop_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when shop goes from closed to open
  IF OLD.is_open = false AND NEW.is_open = true THEN
    -- Create notifications for users who have requested notifications for products in this shop
    INSERT INTO public.notifications (user_id, shop_id, product_id, type, title, message)
    SELECT DISTINCT
      bir.user_id,
      NEW.id,
      NULL,
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

-- Function to create new product notifications
CREATE OR REPLACE FUNCTION public.notify_new_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notifications for customers who have made purchases at this shop
  INSERT INTO public.notifications (user_id, shop_id, product_id, type, title, message)
  SELECT DISTINCT
    pj.user_id,
    NEW.shop_id,
    NEW.id,
    'new_product',
    'New Product Available!',
    s.name || ' has added a new product: ' || NEW.name
  FROM public.purchase_journal pj
  JOIN public.shops s ON s.id = NEW.shop_id
  WHERE pj.shop_id = NEW.shop_id
  AND pj.purchase_date >= NOW() - INTERVAL '30 days'  -- Only notify recent customers
  LIMIT 50;  -- Limit to prevent spam
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS product_stock_notification ON public.products;
CREATE TRIGGER product_stock_notification
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_back_in_stock();

DROP TRIGGER IF EXISTS shop_opened_notification ON public.shops;
CREATE TRIGGER shop_opened_notification
  AFTER UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_shop_opened();

DROP TRIGGER IF EXISTS new_product_notification ON public.products;
CREATE TRIGGER new_product_notification
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_product();

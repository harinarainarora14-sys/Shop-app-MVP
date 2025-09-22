-- Insert sample categories
INSERT INTO public.categories (name, description) VALUES
  ('Groceries', 'Fresh produce, packaged foods, and daily essentials'),
  ('Electronics', 'Phones, computers, and electronic accessories'),
  ('Clothing', 'Apparel and fashion accessories'),
  ('Books', 'Books, magazines, and educational materials'),
  ('Health & Beauty', 'Personal care and beauty products'),
  ('Home & Garden', 'Home improvement and gardening supplies')
ON CONFLICT (name) DO NOTHING;

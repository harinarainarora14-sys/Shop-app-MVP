-- Seeding default chat data and auto-responses
-- Insert default quick reply suggestions for all shops
INSERT INTO quick_reply_templates (shop_id, reply_text, category)
SELECT 
  s.id,
  'Are you open?',
  'hours'
FROM shops s
ON CONFLICT DO NOTHING;

INSERT INTO quick_reply_templates (shop_id, reply_text, category)
SELECT 
  s.id,
  'Is this item available?',
  'availability'
FROM shops s
ON CONFLICT DO NOTHING;

INSERT INTO quick_reply_templates (shop_id, reply_text, category)
SELECT 
  s.id,
  'What is the price?',
  'pricing'
FROM shops s
ON CONFLICT DO NOTHING;

-- Insert default auto-response templates for common queries
INSERT INTO shop_auto_responses (shop_id, response_type, trigger_keywords, response_template)
SELECT 
  s.id,
  'hours',
  ARRAY['open', 'hours', 'timing', 'time', 'closed'],
  CASE 
    WHEN s.is_open THEN 'We are currently OPEN! Check our hours in the shop details.'
    ELSE 'We are currently CLOSED. Please check our opening hours in the shop details.'
  END
FROM shops s
ON CONFLICT DO NOTHING;

INSERT INTO shop_auto_responses (shop_id, response_type, trigger_keywords, response_template)
SELECT 
  s.id,
  'availability',
  ARRAY['available', 'stock', 'have', 'in stock', 'inventory'],
  'Let me check our current inventory for you. Please specify which item you are looking for.'
FROM shops s
ON CONFLICT DO NOTHING;

INSERT INTO shop_auto_responses (shop_id, response_type, trigger_keywords, response_template)
SELECT 
  s.id,
  'pricing',
  ARRAY['price', 'cost', 'how much', 'rate', 'charges'],
  'Please check our product list for current pricing, or let me know which specific item you are interested in.'
FROM shops s
ON CONFLICT DO NOTHING;

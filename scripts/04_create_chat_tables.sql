-- Creating chat system database tables
-- Conversations table to track chat sessions between customers and shops
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table to store all chat messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'quick_reply', 'auto_response', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto responses configuration for shops
CREATE TABLE IF NOT EXISTS shop_auto_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('availability', 'pricing', 'hours', 'custom')),
  trigger_keywords TEXT[] NOT NULL,
  response_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quick reply templates
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'availability', 'pricing', 'hours')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_customer_shop ON conversations(customer_id, shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_shop_auto_responses_shop ON shop_auto_responses(shop_id) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_auto_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (
    customer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM shops WHERE id = conversations.shop_id AND owner_id = auth.uid())
  );

CREATE POLICY "Customers can create conversations" ON conversations
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM shops WHERE id = conversations.shop_id AND owner_id = auth.uid()))
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM shops WHERE id = conversations.shop_id AND owner_id = auth.uid()))
    )
  );

-- RLS Policies for shop auto responses
CREATE POLICY "Shop owners can manage their auto responses" ON shop_auto_responses
  FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = shop_auto_responses.shop_id AND owner_id = auth.uid()));

-- RLS Policies for quick reply templates
CREATE POLICY "Shop owners can manage their quick replies" ON quick_reply_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE id = quick_reply_templates.shop_id AND owner_id = auth.uid()));

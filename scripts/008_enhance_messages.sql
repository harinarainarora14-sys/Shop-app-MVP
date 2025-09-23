-- Add new fields to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_auto_response BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_answered BOOLEAN DEFAULT false;
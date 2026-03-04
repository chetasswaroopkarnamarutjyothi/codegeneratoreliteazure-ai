
-- Create conversations table for saving AI chat sessions
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Conversation',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own conversations" ON public.ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations" ON public.ai_conversations
  FOR SELECT USING (is_admin(auth.uid()));

-- Create admin daily credits allocation tracking table
CREATE TABLE public.admin_credit_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  credits_allocated integer NOT NULL DEFAULT 0,
  allocation_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credit_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own allocations" ON public.admin_credit_allocations
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert allocations" ON public.admin_credit_allocations
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Unique constraint per admin per day
CREATE UNIQUE INDEX idx_admin_credit_alloc_daily ON public.admin_credit_allocations (admin_user_id, allocation_date);


-- Chat channels (for employee team messaging)
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'team' CHECK (channel_type IN ('team', 'direct', 'support')),
  created_by UUID NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Channel members
CREATE TABLE public.chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  file_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Employee termination tracking
CREATE TABLE public.employee_terminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL,
  terminated_by UUID NOT NULL,
  reason TEXT NOT NULL,
  terminated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_terminations ENABLE ROW LEVEL SECURITY;

-- Paid support chat access for users
CREATE TABLE public.support_chat_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_paid INTEGER NOT NULL, -- in paise (₹4500 = 450000)
  access_type TEXT NOT NULL DEFAULT 'initial' CHECK (access_type IN ('initial', 'extension')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  is_active BOOLEAN DEFAULT true,
  priority_level INTEGER DEFAULT 3, -- 1=critical, 2=high, 3=normal
  issue_resolved BOOLEAN DEFAULT false,
  channel_id UUID REFERENCES public.chat_channels(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_access ENABLE ROW LEVEL SECURITY;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;

-- RLS Policies for chat_channels
CREATE POLICY "Channel members can view channels" ON public.chat_channels
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_channel_members WHERE channel_id = chat_channels.id AND user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Employees can create channels" ON public.chat_channels
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'employee') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Channel owners can update" ON public.chat_channels
FOR UPDATE USING (
  created_by = auth.uid() OR is_super_admin(auth.uid())
);

-- RLS for chat_channel_members
CREATE POLICY "Members can view channel members" ON public.chat_channel_members
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_channel_members cm WHERE cm.channel_id = chat_channel_members.channel_id AND cm.user_id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Employees can join channels" ON public.chat_channel_members
FOR INSERT WITH CHECK (
  (has_role(auth.uid(), 'employee') OR has_role(auth.uid(), 'admin'))
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can add members" ON public.chat_channel_members
FOR INSERT WITH CHECK (
  is_admin(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "Members can leave channels" ON public.chat_channel_members
FOR DELETE USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

-- RLS for chat_messages
CREATE POLICY "Channel members can view messages" ON public.chat_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid())
);

CREATE POLICY "Channel members can send messages" ON public.chat_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid())
);

CREATE POLICY "Senders can edit own messages" ON public.chat_messages
FOR UPDATE USING (sender_id = auth.uid());

-- RLS for employee_terminations
CREATE POLICY "Super admin can manage terminations" ON public.employee_terminations
FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view terminations" ON public.employee_terminations
FOR SELECT USING (is_admin(auth.uid()));

-- RLS for support_chat_access
CREATE POLICY "Users can view own support access" ON public.support_chat_access
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create support access" ON public.support_chat_access
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all support access" ON public.support_chat_access
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update support access" ON public.support_chat_access
FOR UPDATE USING (is_admin(auth.uid()));

-- Trigger for updated_at on messages
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_channels_updated_at
BEFORE UPDATE ON public.chat_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

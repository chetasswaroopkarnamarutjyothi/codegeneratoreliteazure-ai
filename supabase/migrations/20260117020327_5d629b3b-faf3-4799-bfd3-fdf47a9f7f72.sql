
-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('bug', 'suggestion')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'declined')),
  admin_response TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email notifications log table (for tracking - can upgrade to real emails later)
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID,
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create penalty tracking table for suggestion violations
CREATE TABLE public.user_penalties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  penalty_type TEXT NOT NULL DEFAULT 'suggestion_declined',
  penalty_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  penalty_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '4 months'),
  daily_credit_reduction INTEGER NOT NULL DEFAULT 11,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS policies for email_notifications (admin only)
CREATE POLICY "Admins can view all notifications"
  ON public.email_notifications FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert notifications"
  ON public.email_notifications FOR INSERT
  WITH CHECK (true);

-- RLS policies for user_penalties
CREATE POLICY "Users can view their own penalties"
  ON public.user_penalties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage penalties"
  ON public.user_penalties FOR ALL
  USING (public.is_admin(auth.uid()));

-- Enable realtime for credit_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_requests;

-- Enable realtime for support_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

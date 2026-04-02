
-- Add birthday to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;

-- Add birthday credits and 6-month penalty tracking to user_points
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS birthday_credits_granted_at date;
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS birthday_credits_expire_at date;
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS half_year_penalty_applied_at date;
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS half_year_usage_count integer DEFAULT 0;

-- Create feedback table
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  rating integer,
  admin_response text,
  responded_by uuid,
  responded_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE USING (is_admin(auth.uid()));

-- Create announcements table
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  is_pinned boolean DEFAULT false,
  is_published boolean DEFAULT true,
  published_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view published announcements" ON public.announcements FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (is_admin(auth.uid()));

-- Create website_controls table (single-row config)
CREATE TABLE public.website_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_mode boolean DEFAULT false,
  maintenance_message text DEFAULT 'We are currently under maintenance. Please check back soon.',
  registration_enabled boolean DEFAULT true,
  feature_chat_enabled boolean DEFAULT true,
  feature_ide_enabled boolean DEFAULT true,
  feature_ai_enabled boolean DEFAULT true,
  feature_projects_enabled boolean DEFAULT true,
  banner_enabled boolean DEFAULT false,
  banner_message text DEFAULT '',
  banner_type text DEFAULT 'info',
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.website_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view controls" ON public.website_controls FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update controls" ON public.website_controls FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert controls" ON public.website_controls FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Insert default website controls row
INSERT INTO public.website_controls (id) VALUES (gen_random_uuid());

-- Triggers for updated_at
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

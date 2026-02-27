
-- Create employee_ids table for admin-generated employee IDs
CREATE TABLE public.employee_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL UNIQUE,
  generated_by uuid NOT NULL,
  assigned_to uuid,
  is_used boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage employee IDs"
ON public.employee_ids FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can read employee IDs for verification"
ON public.employee_ids FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create professional_code_usage table to track monthly professional code usage
CREATE TABLE public.professional_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  prompt text,
  language text,
  credits_used integer DEFAULT 50
);

ALTER TABLE public.professional_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own professional usage"
ON public.professional_code_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own professional usage"
ON public.professional_code_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all professional usage"
ON public.professional_code_usage FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create user_language_preference table
CREATE TABLE public.user_language_preference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  language_code text NOT NULL DEFAULT 'en',
  set_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_language_preference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own language preference"
ON public.user_language_preference FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own language preference"
ON public.user_language_preference FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own language preference"
ON public.user_language_preference FOR UPDATE
USING (auth.uid() = user_id);

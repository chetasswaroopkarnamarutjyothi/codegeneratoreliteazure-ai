
-- Company (StackMind) bank info posted by admin
CREATE TABLE public.company_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text,
  swift_code text,
  upi_id text,
  branch text,
  notes text,
  is_active boolean DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_bank_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view company bank" ON public.company_bank_details FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage company bank" ON public.company_bank_details FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_company_bank_updated BEFORE UPDATE ON public.company_bank_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User-submitted bank details
CREATE TABLE public.user_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text,
  upi_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_bank_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bank" ON public.user_bank_details FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all user bank" ON public.user_bank_details FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Users insert own bank" ON public.user_bank_details FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bank" ON public.user_bank_details FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bank" ON public.user_bank_details FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_bank_updated BEFORE UPDATE ON public.user_bank_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enterprises
CREATE TABLE public.enterprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  contact_email text,
  employee_count integer DEFAULT 0,
  credit_pool integer DEFAULT 0,
  credits_used integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view enterprises" ON public.enterprises FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage enterprises" ON public.enterprises FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_enterprises_updated BEFORE UPDATE ON public.enterprises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enterprise members
CREATE TABLE public.enterprise_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, user_id)
);
ALTER TABLE public.enterprise_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enterprise membership" ON public.enterprise_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage enterprise members" ON public.enterprise_members FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- User layout preferences
CREATE TABLE public.user_layout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sidebar_position text DEFAULT 'left',
  density text DEFAULT 'comfortable',
  font_size text DEFAULT 'medium',
  font_family text DEFAULT 'inter',
  accent_color text DEFAULT 'teal',
  theme_variant text DEFAULT 'midnight',
  widget_order jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_layout_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own layout" ON public.user_layout_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own layout" ON public.user_layout_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own layout" ON public.user_layout_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own layout" ON public.user_layout_preferences FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_layout_updated BEFORE UPDATE ON public.user_layout_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

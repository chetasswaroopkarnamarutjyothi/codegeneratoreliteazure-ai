
-- School organizations table
CREATE TABLE public.school_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain_pattern TEXT NOT NULL,
  teacher_domain_pattern TEXT,
  is_pre_approved BOOLEAN DEFAULT true,
  total_credits_per_class INTEGER DEFAULT 200000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.school_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage school organizations" ON public.school_organizations FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can view schools" ON public.school_organizations FOR SELECT USING (auth.uid() IS NOT NULL);

-- School classes table
CREATE TABLE public.school_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.school_organizations(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  section TEXT NOT NULL,
  credit_pool INTEGER DEFAULT 200000,
  credits_used INTEGER DEFAULT 0,
  teacher_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, class_name, section)
);
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage classes" ON public.school_classes FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can view their classes" ON public.school_classes FOR SELECT USING (teacher_user_id = auth.uid());
CREATE POLICY "Authenticated can view classes" ON public.school_classes FOR SELECT USING (auth.uid() IS NOT NULL);

-- School members table
CREATE TABLE public.school_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.school_organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  admission_no TEXT,
  class_name TEXT,
  section TEXT,
  school_role TEXT NOT NULL DEFAULT 'student',
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id)
);
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage members" ON public.school_members FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own membership" ON public.school_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own membership" ON public.school_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Teachers can view class members" ON public.school_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.school_classes sc
    WHERE sc.id = class_id AND sc.teacher_user_id = auth.uid()
  )
);
CREATE POLICY "Teachers can update class members" ON public.school_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.school_classes sc
    WHERE sc.id = class_id AND sc.teacher_user_id = auth.uid()
  )
);

-- School class monitors (monthly rotation)
CREATE TABLE public.school_class_monitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  month_year TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, month_year)
);
ALTER TABLE public.school_class_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage monitors" ON public.school_class_monitors FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can manage monitors" ON public.school_class_monitors FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.school_classes sc
    WHERE sc.id = class_id AND sc.teacher_user_id = auth.uid()
  )
);
CREATE POLICY "Authenticated can view monitors" ON public.school_class_monitors FOR SELECT USING (auth.uid() IS NOT NULL);

-- Account restore requests
CREATE TABLE public.account_restore_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  temp_password TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.account_restore_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create restore requests" ON public.account_restore_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage restore requests" ON public.account_restore_requests FOR ALL USING (is_admin(auth.uid()));

-- Model credit costs table
CREATE TABLE public.model_credit_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  model_label TEXT NOT NULL,
  standard_cost INTEGER NOT NULL DEFAULT 5,
  professional_multiplier INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.model_credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view costs" ON public.model_credit_costs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage costs" ON public.model_credit_costs FOR ALL USING (is_admin(auth.uid()));

-- Insert default model costs
INSERT INTO public.model_credit_costs (model_id, model_label, standard_cost, professional_multiplier) VALUES
  ('gemini-2.5', 'Gemini 2.5', 10, 50),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 15, 50),
  ('gemini-2.5-pro', 'Gemini 2.5 Pro', 20, 50),
  ('gemini-3-flash-preview', 'Gemini 3 Flash', 25, 50),
  ('gpt-5-mini', 'GPT-5 Mini', 30, 50),
  ('gpt-5', 'GPT-5', 35, 50),
  ('gpt-5-nano', 'GPT-5 Nano', 40, 50),
  ('gemini-3.1-pro-preview', 'Gemini 3.1 Pro', 50, 50),
  ('gpt-5.2', 'GPT-5.2', 60, 50),
  ('gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 5, 50);

-- Insert SBPS school org
INSERT INTO public.school_organizations (name, domain_pattern, teacher_domain_pattern, is_pre_approved, total_credits_per_class)
VALUES ('Shishya BEML Public School', '@shishyabemlschool.edu.in', '@shishyabemlschool.edu.com', true, 200000);


-- ============ ID Card Assets (singleton: company logo) ============
CREATE TABLE public.id_card_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.id_card_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read id_card_assets" ON public.id_card_assets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage id_card_assets" ON public.id_card_assets FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
INSERT INTO public.id_card_assets (logo_url) VALUES (NULL);

-- ============ Employee ID Cards ============
CREATE TABLE public.employee_id_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id uuid NOT NULL UNIQUE,
  employee_id text NOT NULL UNIQUE,
  full_name text,
  designation text,
  photo_url text,
  qr_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  blood_group text,
  is_ceo boolean NOT NULL DEFAULT false,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_id_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees read own id card" ON public.employee_id_cards FOR SELECT USING (auth.uid() = employee_user_id OR is_admin(auth.uid()));
CREATE POLICY "Admins manage id cards" ON public.employee_id_cards FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ============ Office Swipes ============
CREATE TABLE public.office_swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  swipe_date date NOT NULL DEFAULT CURRENT_DATE,
  swipe_in_at timestamptz NOT NULL DEFAULT now(),
  swipe_out_at timestamptz,
  method text NOT NULL DEFAULT 'camera',
  device_info text,
  location_hint text,
  qr_token uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, swipe_date)
);
ALTER TABLE public.office_swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own swipes" ON public.office_swipes FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users insert own swipe" ON public.office_swipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own swipe" ON public.office_swipes FOR UPDATE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- ============ Leave Requests ============
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leave_type text NOT NULL DEFAULT 'casual',
  from_date date NOT NULL,
  to_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own leaves" ON public.leave_requests FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users create own leaves" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending leave" ON public.leave_requests FOR UPDATE USING ((auth.uid() = user_id AND status='pending') OR is_admin(auth.uid()));
CREATE POLICY "Admins delete leaves" ON public.leave_requests FOR DELETE USING (is_admin(auth.uid()));

-- ============ Company Events / Holidays ============
CREATE TABLE public.company_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  end_date date,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'holiday',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read events" ON public.company_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage events" ON public.company_events FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ============ Company Policies ============
CREATE TABLE public.company_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  category text NOT NULL DEFAULT 'general',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  requires_acknowledgement boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read policies" ON public.company_policies FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = true);
CREATE POLICY "Admins manage policies" ON public.company_policies FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.policy_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL,
  user_id uuid NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_id, user_id)
);
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own acks" ON public.policy_acknowledgements FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users insert own acks" ON public.policy_acknowledgements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ Credit Payment Submissions (real-time admin alerts) ============
CREATE TABLE public.credit_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_id text NOT NULL,
  payment_method text NOT NULL DEFAULT 'upi',
  plan_type text,
  screenshot_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own submissions" ON public.credit_payment_submissions FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users create submissions" ON public.credit_payment_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update submissions" ON public.credit_payment_submissions FOR UPDATE USING (is_admin(auth.uid()));

-- ============ Enterprise tier audit trigger ============
CREATE OR REPLACE FUNCTION public.log_enterprise_tier_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.admin_audit_trail (action_category, action_type, target_name, target_id, amount, notes, performed_by, metadata)
  VALUES ('credit_allocation',
          CASE WHEN TG_OP='INSERT' THEN 'tier_created' ELSE 'tier_updated' END,
          NEW.enterprise_name, NEW.id, NEW.credit_pool, NEW.notes, COALESCE(NEW.updated_by, auth.uid()),
          jsonb_build_object('old_pool', CASE WHEN TG_OP='UPDATE' THEN OLD.credit_pool ELSE NULL END,
                             'new_pool', NEW.credit_pool));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_log_enterprise_tier ON public.enterprise_credit_tiers;
CREATE TRIGGER trg_log_enterprise_tier AFTER INSERT OR UPDATE ON public.enterprise_credit_tiers
FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_tier_change();

-- ============ Profile completeness now requires birthday ============
CREATE OR REPLACE FUNCTION public.is_profile_complete(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_p RECORD; v_email text;
BEGIN
  SELECT * INTO v_p FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_p.full_name IS NULL OR v_p.full_name='' OR v_p.age IS NULL OR v_p.age <= 0 THEN RETURN false; END IF;
  -- super-admins exempt from birthday requirement
  IF v_p.email IN ('kchetasswaroop@gmail.com','vickyvpurohit@gmail.com') THEN RETURN true; END IF;
  IF v_p.birthday IS NULL THEN RETURN false; END IF;
  RETURN true;
END; $$;

-- ============ Auto-create id_card stub for new employees ============
CREATE OR REPLACE FUNCTION public.create_id_card_for_employee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_emp text; v_name text; v_email text;
BEGIN
  IF NEW.role <> 'employee' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.employee_id_cards WHERE employee_user_id = NEW.user_id) THEN RETURN NEW; END IF;
  -- claim first available employee_id, else generate
  SELECT employee_id INTO v_emp FROM public.employee_ids WHERE is_used = false ORDER BY created_at LIMIT 1;
  IF v_emp IS NULL THEN
    v_emp := 'SM-EMP-' || lpad(floor(10000 + random()*90000)::text, 5, '0');
    INSERT INTO public.employee_ids (employee_id, generated_by, is_used, assigned_to) VALUES (v_emp, NEW.user_id, true, NEW.user_id);
  ELSE
    UPDATE public.employee_ids SET is_used = true, assigned_to = NEW.user_id WHERE employee_id = v_emp;
  END IF;
  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.employee_id_cards (employee_user_id, employee_id, full_name, is_ceo)
  VALUES (NEW.user_id, v_emp, COALESCE(v_name,'Employee'), v_email = 'kchetasswaroop@gmail.com');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_create_id_card ON public.user_roles;
CREATE TRIGGER trg_create_id_card AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.create_id_card_for_employee();

-- ============ Storage bucket for ID card photos ============
INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Admins read id-card files" ON storage.objects FOR SELECT
  USING (bucket_id='id-cards' AND (is_admin(auth.uid()) OR auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "Admins upload id-card files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='id-cards' AND is_admin(auth.uid()));
CREATE POLICY "Admins update id-card files" ON storage.objects FOR UPDATE
  USING (bucket_id='id-cards' AND is_admin(auth.uid()));

-- ============ Realtime publications ============
ALTER TABLE public.credit_payment_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.office_swipes REPLICA IDENTITY FULL;
ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_payment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.office_swipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;

-- ============ updated_at triggers ============
CREATE TRIGGER trg_idc_updated BEFORE UPDATE ON public.employee_id_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lr_updated BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pol_updated BEFORE UPDATE ON public.company_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

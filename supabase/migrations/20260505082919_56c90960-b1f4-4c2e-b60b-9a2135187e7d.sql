
CREATE TABLE IF NOT EXISTS public.admin_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_name TEXT,
  target_id UUID,
  amount INTEGER,
  notes TEXT,
  performed_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit trail" ON public.admin_audit_trail FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System/admins insert audit trail" ON public.admin_audit_trail FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON public.admin_audit_trail(action_category);

-- Trigger: log bank verification changes
CREATE OR REPLACE FUNCTION public.log_bank_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND COALESCE(OLD.verification_status,'') <> COALESCE(NEW.verification_status,'')) THEN
    INSERT INTO public.admin_audit_trail (action_category, action_type, target_name, target_id, notes, performed_by, metadata)
    VALUES ('bank_verification', NEW.verification_status, NEW.account_name, NEW.id, NEW.review_notes, NEW.reviewed_by,
            jsonb_build_object('bank_name', NEW.bank_name, 'account_number_last4', RIGHT(NEW.account_number, 4)));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_bank_verification ON public.user_bank_details;
CREATE TRIGGER trg_log_bank_verification AFTER UPDATE ON public.user_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.log_bank_verification();

-- Trigger: log enterprise credit allocations
CREATE OR REPLACE FUNCTION public.log_enterprise_allocation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_audit_trail (action_category, action_type, target_name, target_id, amount, notes, performed_by, metadata)
  VALUES ('credit_allocation', NEW.mode, NEW.enterprise_name, NEW.enterprise_id, NEW.amount, NEW.notes, NEW.allocated_by,
          jsonb_build_object('mode', NEW.mode));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_enterprise_allocation ON public.enterprise_credit_allocations;
CREATE TRIGGER trg_log_enterprise_allocation AFTER INSERT ON public.enterprise_credit_allocations
  FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_allocation();

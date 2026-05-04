
CREATE TABLE IF NOT EXISTS public.enterprise_credit_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID,
  enterprise_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'pool',
  notes TEXT,
  allocated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_credit_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage allocation history" ON public.enterprise_credit_allocations
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.user_bank_details
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE TABLE IF NOT EXISTS public.enterprise_credit_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_name TEXT UNIQUE NOT NULL,
  credit_pool INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_credit_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage enterprise tiers" ON public.enterprise_credit_tiers
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated view tiers" ON public.enterprise_credit_tiers
  FOR SELECT USING (auth.uid() IS NOT NULL);

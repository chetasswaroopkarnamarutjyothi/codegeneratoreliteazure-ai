-- Restrict admin visibility into enterprise_members to enforce privacy.
-- Admins should only see enterprise names + credit totals (via enterprise_credit_tiers),
-- not individual employee membership.
DROP POLICY IF EXISTS "Admins manage enterprise members" ON public.enterprise_members;

-- Admins can still INSERT/UPDATE/DELETE memberships for management, but cannot SELECT them.
CREATE POLICY "Admins can insert memberships"
  ON public.enterprise_members FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update memberships"
  ON public.enterprise_members FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete memberships"
  ON public.enterprise_members FOR DELETE
  USING (is_admin(auth.uid()));
-- Note: existing "Users view own enterprise membership" policy remains; no admin SELECT policy is created,
-- so admins cannot read employee lists.
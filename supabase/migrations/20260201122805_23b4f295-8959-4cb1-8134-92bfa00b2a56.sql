-- Add employee role to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'employee';

-- Create employee_ldap table for tracking LDAP authenticated users
CREATE TABLE IF NOT EXISTS public.employee_ldap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  ldap_verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_ldap ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_ldap
CREATE POLICY "Admins can view all LDAP users" ON public.employee_ldap
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own LDAP status" ON public.employee_ldap
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert LDAP" ON public.employee_ldap
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create admin_management table for Chetas Swaroop to manage other admins
CREATE TABLE IF NOT EXISTS public.admin_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  managed_by UUID NOT NULL, -- Must be Chetas Swaroop
  action_type TEXT NOT NULL CHECK (action_type IN ('grant_admin', 'revoke_admin', 'temp_admin')),
  is_temporary BOOLEAN DEFAULT false,
  temp_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.admin_management ENABLE ROW LEVEL SECURITY;

-- Only Chetas Swaroop (kchetasswaroop@gmail.com) can manage admins
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND email = 'kchetasswaroop@gmail.com'
  )
$$;

-- RLS for admin_management
CREATE POLICY "Super admin can manage all" ON public.admin_management
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view management logs" ON public.admin_management
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Function to grant admin role (only for super admin - Chetas Swaroop)
CREATE OR REPLACE FUNCTION public.grant_admin_role(
  p_target_user_id UUID,
  p_is_temporary BOOLEAN DEFAULT false,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is super admin (Chetas Swaroop)
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Chetas Swaroop can grant admin roles';
  END IF;

  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update user points to admin levels
  UPDATE public.user_points
  SET daily_points = 885000,
      monthly_points = 9185000,
      approval_bank_credits = 285000
  WHERE user_id = p_target_user_id;

  -- Log the action
  INSERT INTO public.admin_management (target_user_id, managed_by, action_type, is_temporary, temp_expires_at, notes)
  VALUES (p_target_user_id, auth.uid(), 
          CASE WHEN p_is_temporary THEN 'temp_admin' ELSE 'grant_admin' END,
          p_is_temporary, p_expires_at, p_notes);

  RETURN true;
END;
$$;

-- Function to revoke admin role (only for super admin - Chetas Swaroop)
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  p_target_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is super admin (Chetas Swaroop)
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Chetas Swaroop can revoke admin roles';
  END IF;

  -- Cannot revoke own admin
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;

  -- Remove admin role
  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role = 'admin';

  -- Reset to regular user credits
  UPDATE public.user_points
  SET daily_points = 50,
      monthly_points = 0,
      approval_bank_credits = 0
  WHERE user_id = p_target_user_id;

  -- Log the action
  INSERT INTO public.admin_management (target_user_id, managed_by, action_type, notes)
  VALUES (p_target_user_id, auth.uid(), 'revoke_admin', p_notes);

  RETURN true;
END;
$$;

-- Update daily reset function to include approval bank reset daily
CREATE OR REPLACE FUNCTION public.reset_daily_credits_with_penalties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record RECORD;
  penalty_record RECORD;
  admin_record RECORD;
  employee_record RECORD;
  base_credits INTEGER := 50;
  employee_credits INTEGER := 100; -- Employees get 100 daily credits
  final_credits INTEGER;
BEGIN
  -- Process regular users (non-admin, non-employee)
  FOR user_record IN 
    SELECT up.* FROM public.user_points up
    LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id AND ur.role IN ('admin', 'employee')
    WHERE ur.role IS NULL
  LOOP
    SELECT * INTO penalty_record FROM public.user_penalties 
    WHERE user_id = user_record.user_id 
    AND is_active = true 
    AND penalty_end_date > now()
    LIMIT 1;
    
    IF FOUND THEN
      final_credits := base_credits - penalty_record.daily_credit_reduction;
    ELSE
      UPDATE public.user_penalties 
      SET is_active = false 
      WHERE user_id = user_record.user_id AND penalty_end_date <= now();
      
      final_credits := base_credits;
    END IF;
    
    UPDATE public.user_points 
    SET daily_points = final_credits, last_daily_reset = CURRENT_DATE
    WHERE user_id = user_record.user_id;
  END LOOP;

  -- Process employees (100 daily credits)
  FOR employee_record IN 
    SELECT up.* FROM public.user_points up
    INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
    WHERE ur.role = 'employee'
  LOOP
    UPDATE public.user_points 
    SET daily_points = employee_credits,
        last_daily_reset = CURRENT_DATE
    WHERE user_id = employee_record.user_id;
  END LOOP;

  -- Process admin users with recurring daily approval credits: 885000 daily, 9185000 monthly, 285000 approval bank
  FOR admin_record IN 
    SELECT up.* FROM public.user_points up
    INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    UPDATE public.user_points 
    SET daily_points = 885000,
        monthly_points = 9185000,
        approval_bank_credits = 285000, -- Daily recurring approval credits
        last_daily_reset = CURRENT_DATE
    WHERE user_id = admin_record.user_id;
  END LOOP;

  -- Check for expired temporary admin roles
  UPDATE public.user_roles ur
  SET role = 'user'
  WHERE role = 'admin'
  AND EXISTS (
    SELECT 1 FROM public.admin_management am 
    WHERE am.target_user_id = ur.user_id 
    AND am.is_temporary = true 
    AND am.temp_expires_at <= now()
  );
END;
$$;

-- Update the reset_daily_credits_with_penalties function with correct admin values
CREATE OR REPLACE FUNCTION public.reset_daily_credits_with_penalties()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  penalty_record RECORD;
  admin_record RECORD;
  employee_record RECORD;
  base_credits INTEGER := 50;
  employee_credits INTEGER := 100;
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

  -- Process admin users: 1,095,000 daily, 9,185,000 monthly, 585,000 approval bank
  FOR admin_record IN 
    SELECT up.* FROM public.user_points up
    INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    UPDATE public.user_points 
    SET daily_points = 1095000,
        monthly_points = 9185000,
        approval_bank_credits = 585000,
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
$function$;

-- Update setup_new_user to use correct admin values
CREATE OR REPLACE FUNCTION public.setup_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('sirishapillai@gmail.com', 'kchetasswaroop@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    INSERT INTO public.user_points (user_id, daily_points, monthly_points, approval_bank_credits, reserved_credits, is_premium)
    VALUES (NEW.user_id, 1095000, 9185000, 585000, 0, true)
    ON CONFLICT (user_id) DO UPDATE SET
      daily_points = 1095000,
      monthly_points = 9185000,
      approval_bank_credits = 585000,
      is_premium = true;
  ELSE
    INSERT INTO public.user_points (user_id, daily_points, monthly_points, approval_bank_credits, reserved_credits, is_premium)
    VALUES (NEW.user_id, 50, 0, 0, 0, false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update grant_admin_role to use correct values
CREATE OR REPLACE FUNCTION public.grant_admin_role(p_target_user_id uuid, p_is_temporary boolean DEFAULT false, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only Chetas Swaroop can grant admin roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.user_points
  SET daily_points = 1095000,
      monthly_points = 9185000,
      approval_bank_credits = 585000
  WHERE user_id = p_target_user_id;

  INSERT INTO public.admin_management (target_user_id, managed_by, action_type, is_temporary, temp_expires_at, notes)
  VALUES (p_target_user_id, auth.uid(), 
          CASE WHEN p_is_temporary THEN 'temp_admin' ELSE 'grant_admin' END,
          p_is_temporary, p_expires_at, p_notes);

  RETURN true;
END;
$function$;


-- Add custom_daily_limit column to user_points to persist admin-set credits across resets
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS custom_daily_limit integer DEFAULT NULL;

-- Update the reset function to use custom_daily_limit when set
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
    -- Use custom_daily_limit if set by admin, otherwise use base credits
    IF user_record.custom_daily_limit IS NOT NULL AND user_record.custom_daily_limit > 0 THEN
      final_credits := user_record.custom_daily_limit;
    ELSE
      final_credits := base_credits;
    END IF;

    SELECT * INTO penalty_record FROM public.user_penalties 
    WHERE user_id = user_record.user_id 
    AND is_active = true 
    AND penalty_end_date > now()
    LIMIT 1;
    
    IF FOUND THEN
      final_credits := final_credits - penalty_record.daily_credit_reduction;
    ELSE
      UPDATE public.user_penalties 
      SET is_active = false 
      WHERE user_id = user_record.user_id AND penalty_end_date <= now();
    END IF;
    
    UPDATE public.user_points 
    SET daily_points = final_credits, last_daily_reset = CURRENT_DATE
    WHERE user_id = user_record.user_id;
  END LOOP;

  -- Process employees (100 daily credits, or custom if set)
  FOR employee_record IN 
    SELECT up.* FROM public.user_points up
    INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
    WHERE ur.role = 'employee'
  LOOP
    IF employee_record.custom_daily_limit IS NOT NULL AND employee_record.custom_daily_limit > 0 THEN
      final_credits := employee_record.custom_daily_limit;
    ELSE
      final_credits := employee_credits;
    END IF;

    UPDATE public.user_points 
    SET daily_points = final_credits,
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

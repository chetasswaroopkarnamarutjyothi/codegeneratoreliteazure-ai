
-- Update admin credits: 685,000 daily, 285,000 approval bank
-- Fix the reset function to reset approval bank daily to 285,000 for admins

CREATE OR REPLACE FUNCTION public.reset_daily_credits_with_penalties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  penalty_record RECORD;
  base_credits INTEGER := 50;
  final_credits INTEGER;
  is_user_admin BOOLEAN;
BEGIN
  FOR user_record IN SELECT up.* FROM public.user_points up LOOP
    -- Check if user is admin
    SELECT public.is_admin(user_record.user_id) INTO is_user_admin;
    
    IF is_user_admin THEN
      -- Admin: reset to 685,000 daily and 285,000 approval bank
      UPDATE public.user_points 
      SET daily_points = 685000, 
          approval_bank_credits = 285000,
          last_daily_reset = CURRENT_DATE
      WHERE user_id = user_record.user_id;
    ELSE
      -- Regular user: check for penalties
      SELECT * INTO penalty_record FROM public.user_penalties 
      WHERE user_id = user_record.user_id 
      AND is_active = true 
      AND penalty_end_date > now()
      LIMIT 1;
      
      IF FOUND THEN
        final_credits := base_credits - penalty_record.daily_credit_reduction;
      ELSE
        -- Deactivate expired penalties
        UPDATE public.user_penalties 
        SET is_active = false 
        WHERE user_id = user_record.user_id AND penalty_end_date <= now();
        
        final_credits := base_credits;
      END IF;
      
      UPDATE public.user_points 
      SET daily_points = final_credits, last_daily_reset = CURRENT_DATE
      WHERE user_id = user_record.user_id;
    END IF;
  END LOOP;
END;
$$;

-- Update existing admin accounts to have correct credits now
UPDATE public.user_points 
SET daily_points = 685000, 
    approval_bank_credits = 285000,
    monthly_points = 8100000
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);

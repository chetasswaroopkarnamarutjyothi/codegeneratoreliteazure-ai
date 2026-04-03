
-- Function to grant birthday credits (500 credits, expires in 2 months)
CREATE OR REPLACE FUNCTION public.grant_birthday_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  FOR user_record IN
    SELECT p.user_id, p.birthday, up.birthday_credits_granted_at, up.daily_points
    FROM public.profiles p
    INNER JOIN public.user_points up ON p.user_id = up.user_id
    WHERE p.birthday IS NOT NULL
      AND EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM today)
      AND EXTRACT(DAY FROM p.birthday) = EXTRACT(DAY FROM today)
      AND (up.birthday_credits_granted_at IS NULL 
           OR EXTRACT(YEAR FROM up.birthday_credits_granted_at) < EXTRACT(YEAR FROM today))
  LOOP
    UPDATE public.user_points
    SET daily_points = daily_points + 500,
        birthday_credits_granted_at = today,
        birthday_credits_expire_at = today + INTERVAL '2 months'
    WHERE user_id = user_record.user_id;
  END LOOP;
END;
$$;

-- Function to expire birthday credits (remove 500 if not used by expiry)
CREATE OR REPLACE FUNCTION public.expire_birthday_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_points
  SET birthday_credits_expire_at = NULL,
      birthday_credits_granted_at = NULL
  WHERE birthday_credits_expire_at IS NOT NULL
    AND birthday_credits_expire_at <= CURRENT_DATE;
END;
$$;

-- Function to check 6-month usage and apply penalty
CREATE OR REPLACE FUNCTION public.check_half_year_usage_penalty()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  usage_count INTEGER;
  six_months_ago DATE := CURRENT_DATE - INTERVAL '6 months';
BEGIN
  FOR user_record IN
    SELECT up.user_id, up.half_year_penalty_applied_at, up.custom_daily_limit
    FROM public.user_points up
    LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id AND ur.role IN ('admin', 'employee')
    WHERE ur.role IS NULL
      AND (up.half_year_penalty_applied_at IS NULL 
           OR up.half_year_penalty_applied_at <= six_months_ago)
  LOOP
    -- Count usage in last 6 months
    SELECT COALESCE(SUM(COALESCE(points_used, 5)), 0) INTO usage_count
    FROM public.usage_history
    WHERE user_id = user_record.user_id
      AND created_at >= six_months_ago;

    IF usage_count < 10 THEN
      -- Halve the user's daily credit limit for the next 6 months
      UPDATE public.user_points
      SET custom_daily_limit = GREATEST(
            COALESCE(user_record.custom_daily_limit, 50) / 2, 
            5
          ),
          half_year_penalty_applied_at = CURRENT_DATE,
          half_year_usage_count = usage_count
      WHERE user_id = user_record.user_id;
    ELSE
      -- Reset penalty tracking
      UPDATE public.user_points
      SET half_year_penalty_applied_at = CURRENT_DATE,
          half_year_usage_count = usage_count
      WHERE user_id = user_record.user_id;
    END IF;
  END LOOP;
END;
$$;

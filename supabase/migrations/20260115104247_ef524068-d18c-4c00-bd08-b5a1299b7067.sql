-- Insert admin roles for specific emails (we'll need to get their user IDs after they sign up)
-- For now, create a trigger that automatically grants admin role when these emails sign up

CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email matches admin emails
  IF NEW.email IN ('sirishapillai@gmail.com', 'kchetasswaroop@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also create their user_points with admin credits
    INSERT INTO public.user_points (user_id, daily_points, monthly_points, approval_bank_credits, is_premium)
    VALUES (NEW.id, 285000, 8100000, 85000, true)
    ON CONFLICT (user_id) DO UPDATE SET
      daily_points = 285000,
      monthly_points = 8100000,
      approval_bank_credits = 85000,
      is_premium = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_admin_role();

-- Also add a function for admins to transfer credits to approval bank
CREATE OR REPLACE FUNCTION public.transfer_to_approval_bank(amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_daily INTEGER;
  current_reserved INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can transfer to approval bank';
  END IF;
  
  -- Get current values
  SELECT daily_points, reserved_credits INTO current_daily, current_reserved
  FROM user_points
  WHERE user_id = auth.uid();
  
  -- Check if enough daily points
  IF current_daily < amount THEN
    RAISE EXCEPTION 'Insufficient daily credits';
  END IF;
  
  -- Transfer from daily to reserved (approval bank)
  UPDATE user_points
  SET 
    daily_points = daily_points - amount,
    reserved_credits = COALESCE(reserved_credits, 0) + amount
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- Function for admins to grant credits from approval bank to users
CREATE OR REPLACE FUNCTION public.grant_credits_from_bank(target_user_id UUID, amount INTEGER, grant_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_bank INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can grant credits';
  END IF;
  
  -- Get current approval bank balance
  SELECT approval_bank_credits INTO current_bank
  FROM user_points
  WHERE user_id = auth.uid();
  
  -- Check if enough credits in bank
  IF current_bank < amount THEN
    RAISE EXCEPTION 'Insufficient credits in approval bank';
  END IF;
  
  -- Deduct from admin's approval bank
  UPDATE user_points
  SET approval_bank_credits = approval_bank_credits - amount
  WHERE user_id = auth.uid();
  
  -- Add to target user's daily points
  UPDATE user_points
  SET daily_points = daily_points + amount
  WHERE user_id = target_user_id;
  
  -- Record the grant
  INSERT INTO point_grants (admin_user_id, target_user_id, points_granted, reason)
  VALUES (auth.uid(), target_user_id, amount, grant_reason);
  
  RETURN TRUE;
END;
$$;
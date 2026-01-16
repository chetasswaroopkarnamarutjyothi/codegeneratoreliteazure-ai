
-- Insert admin roles for existing admin users
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles 
WHERE email IN ('sirishapillai@gmail.com', 'kchetasswaroop@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert/update admin credits for existing admin users
INSERT INTO public.user_points (user_id, daily_points, monthly_points, approval_bank_credits, reserved_credits, is_premium)
SELECT user_id, 285000, 8100000, 85000, 0, true
FROM public.profiles
WHERE email IN ('sirishapillai@gmail.com', 'kchetasswaroop@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET
  daily_points = 285000,
  monthly_points = 8100000,
  approval_bank_credits = 85000,
  is_premium = true;

-- Create function to setup new users (called after profile creation)
CREATE OR REPLACE FUNCTION public.setup_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an admin email
  IF NEW.email IN ('sirishapillai@gmail.com', 'kchetasswaroop@gmail.com') THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Insert admin credits
    INSERT INTO public.user_points (user_id, daily_points, monthly_points, approval_bank_credits, reserved_credits, is_premium)
    VALUES (NEW.user_id, 285000, 8100000, 85000, 0, true)
    ON CONFLICT (user_id) DO UPDATE SET
      daily_points = 285000,
      monthly_points = 8100000,
      approval_bank_credits = 85000,
      is_premium = true;
  ELSE
    -- Insert standard user credits (50 daily)
    INSERT INTO public.user_points (user_id, daily_points, monthly_points, approval_bank_credits, reserved_credits, is_premium)
    VALUES (NEW.user_id, 50, 0, 0, 0, false)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table to auto-setup users
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.setup_new_user();

-- Also add INSERT policy for user_points so the trigger can work
CREATE POLICY "System can insert user points"
ON public.user_points
FOR INSERT
WITH CHECK (true);


-- Update admin credits to new values: 8,85,000 daily, 91,85,000 monthly, 2,85,000 approval
-- Function to reset daily credits with updated admin amounts
CREATE OR REPLACE FUNCTION public.reset_daily_credits_with_penalties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  penalty_record RECORD;
  admin_record RECORD;
  base_credits INTEGER := 50;
  final_credits INTEGER;
BEGIN
  -- Process regular users
  FOR user_record IN SELECT up.* FROM public.user_points up
    LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id AND ur.role = 'admin'
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

  -- Process admin users with new credit amounts: 885000 daily, 9185000 monthly, 285000 approval
  FOR admin_record IN SELECT up.* FROM public.user_points up
    INNER JOIN public.user_roles ur ON up.user_id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    UPDATE public.user_points 
    SET daily_points = 885000,
        monthly_points = 9185000,
        approval_bank_credits = 285000,
        last_daily_reset = CURRENT_DATE
    WHERE user_id = admin_record.user_id;
  END LOOP;
END;
$$;

-- Create table for QR login tokens
CREATE TABLE IF NOT EXISTS public.qr_login_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanned', 'authenticated', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  authenticated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.qr_login_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select their own pending tokens
CREATE POLICY "Users can view their pending tokens"
  ON public.qr_login_tokens FOR SELECT
  USING (status = 'pending' OR user_id = auth.uid());

-- Allow authenticated users to update tokens
CREATE POLICY "Authenticated users can update tokens"
  ON public.qr_login_tokens FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Allow inserts for new tokens
CREATE POLICY "Anyone can create tokens"
  ON public.qr_login_tokens FOR INSERT
  WITH CHECK (true);

-- Function to assign random admin from groups of 4 users
CREATE OR REPLACE FUNCTION public.assign_random_admin_from_group()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_batch UUID[];
  selected_admin UUID;
  batch_count INTEGER;
BEGIN
  -- Get users who don't have admin role, ordered by creation date
  SELECT ARRAY_AGG(p.user_id ORDER BY p.created_at)
  INTO user_batch
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id AND ur.role = 'admin'
  WHERE ur.role IS NULL;
  
  -- Process in groups of 4
  IF user_batch IS NOT NULL THEN
    batch_count := COALESCE(array_length(user_batch, 1), 0) / 4;
    
    FOR i IN 0..batch_count-1 LOOP
      -- Select random user from the group of 4
      selected_admin := user_batch[(i * 4) + 1 + floor(random() * 4)::int];
      
      -- Assign admin role if not already assigned
      INSERT INTO public.user_roles (user_id, role)
      VALUES (selected_admin, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Set admin credits
      UPDATE public.user_points
      SET daily_points = 885000, monthly_points = 9185000, approval_bank_credits = 285000
      WHERE user_id = selected_admin;
    END LOOP;
  END IF;
END;
$$;

-- Update existing admins to new credit amounts
UPDATE public.user_points up
SET daily_points = 885000,
    monthly_points = 9185000,
    approval_bank_credits = 285000
FROM public.user_roles ur
WHERE up.user_id = ur.user_id AND ur.role = 'admin';

-- Enable realtime for QR tokens
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_login_tokens;

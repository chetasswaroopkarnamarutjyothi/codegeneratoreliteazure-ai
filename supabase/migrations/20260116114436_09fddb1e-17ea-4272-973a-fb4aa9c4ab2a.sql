
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert user points" ON public.user_points;

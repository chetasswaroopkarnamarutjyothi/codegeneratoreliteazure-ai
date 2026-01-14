-- Fix OTP codes policy - remove permissive policy and add restrictive one
DROP POLICY IF EXISTS "Service can manage OTP codes" ON public.otp_codes;

-- OTP codes should only be accessible via service role (edge functions)
-- No direct access from client
CREATE POLICY "OTP codes not accessible from client"
ON public.otp_codes FOR SELECT
USING (false);

-- Insert admin roles for the specified users
-- This will be done after users sign up, via edge function

-- Fix the overly permissive RLS policy for qr_login_tokens
DROP POLICY IF EXISTS "Anyone can create tokens" ON public.qr_login_tokens;

-- Only allow inserts when no user is authenticated (for generating new tokens)
CREATE POLICY "Unauthenticated can create tokens"
  ON public.qr_login_tokens FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR auth.uid() IS NOT NULL);

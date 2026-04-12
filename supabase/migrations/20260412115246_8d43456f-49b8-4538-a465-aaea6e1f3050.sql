
DROP POLICY "Anyone can create restore requests" ON public.account_restore_requests;
CREATE POLICY "Anyone can create restore requests" ON public.account_restore_requests 
  FOR INSERT WITH CHECK (email IS NOT NULL AND email != '' AND reason IS NOT NULL AND reason != '');

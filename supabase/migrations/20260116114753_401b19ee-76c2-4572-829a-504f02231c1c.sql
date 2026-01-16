
-- Create credit_requests table for users to request credits
CREATE TABLE public.credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own credit requests"
ON public.credit_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create credit requests"
ON public.credit_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all credit requests"
ON public.credit_requests
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update requests (approve/deny)
CREATE POLICY "Admins can update credit requests"
ON public.credit_requests
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create function to approve credit request
CREATE OR REPLACE FUNCTION public.approve_credit_request(request_id UUID, admin_notes_text TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  current_bank INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve requests';
  END IF;
  
  -- Get the request
  SELECT * INTO req FROM credit_requests WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Get admin's approval bank balance
  SELECT approval_bank_credits INTO current_bank
  FROM user_points
  WHERE user_id = auth.uid();
  
  -- Check if enough credits in bank
  IF current_bank < req.amount THEN
    RAISE EXCEPTION 'Insufficient credits in approval bank';
  END IF;
  
  -- Deduct from admin's approval bank
  UPDATE user_points
  SET approval_bank_credits = approval_bank_credits - req.amount
  WHERE user_id = auth.uid();
  
  -- Add to user's daily points
  UPDATE user_points
  SET daily_points = daily_points + req.amount
  WHERE user_id = req.user_id;
  
  -- Update request status
  UPDATE credit_requests
  SET status = 'approved',
      admin_notes = admin_notes_text,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = request_id;
  
  -- Record in point_grants
  INSERT INTO point_grants (admin_user_id, target_user_id, points_granted, reason)
  VALUES (auth.uid(), req.user_id, req.amount, COALESCE(req.reason, 'Credit request approved'));
  
  RETURN TRUE;
END;
$$;

-- Create function to deny credit request
CREATE OR REPLACE FUNCTION public.deny_credit_request(request_id UUID, admin_notes_text TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can deny requests';
  END IF;
  
  -- Update request status
  UPDATE credit_requests
  SET status = 'denied',
      admin_notes = admin_notes_text,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  RETURN TRUE;
END;
$$;


-- Fix the overly permissive RLS policy for email_notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.email_notifications;

-- Only allow inserts from authenticated users or database functions
CREATE POLICY "Authenticated users can insert notifications"
  ON public.email_notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to reset daily credits with penalty consideration
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
BEGIN
  FOR user_record IN SELECT * FROM public.user_points LOOP
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
    SET daily_points = final_credits, last_daily_reset = now()
    WHERE user_id = user_record.user_id;
  END LOOP;
END;
$$;

-- Function to handle ticket resolution with credit adjustments
CREATE OR REPLACE FUNCTION public.resolve_ticket(
  p_ticket_id UUID,
  p_status TEXT,
  p_admin_response TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only admins can resolve tickets';
  END IF;
  
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;
  
  UPDATE public.support_tickets
  SET status = p_status,
      admin_response = p_admin_response,
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_ticket_id;
  
  IF v_ticket.ticket_type = 'suggestion' THEN
    IF p_status = 'resolved' THEN
      UPDATE public.user_points
      SET daily_points = LEAST(daily_points + 2, 52)
      WHERE user_id = v_ticket.user_id;
    ELSIF p_status = 'declined' THEN
      INSERT INTO public.user_penalties (user_id, penalty_type, daily_credit_reduction)
      VALUES (v_ticket.user_id, 'suggestion_declined', 11);
      
      UPDATE public.user_points
      SET daily_points = GREATEST(daily_points - 11, 39)
      WHERE user_id = v_ticket.user_id;
    END IF;
  END IF;
  
  INSERT INTO public.email_notifications (recipient_user_id, recipient_email, notification_type, subject, body, metadata)
  SELECT 
    v_ticket.user_id,
    p.email,
    'ticket_' || p_status,
    CASE 
      WHEN p_status = 'resolved' THEN 'Your ticket has been resolved!'
      WHEN p_status = 'declined' THEN 'Your ticket has been declined'
      ELSE 'Your ticket status has been updated'
    END,
    COALESCE(p_admin_response, 'Your ticket #' || v_ticket.id || ' status has been updated to: ' || p_status),
    jsonb_build_object('ticket_id', p_ticket_id, 'ticket_type', v_ticket.ticket_type, 'status', p_status)
  FROM public.profiles p WHERE p.user_id = v_ticket.user_id;
  
  RETURN true;
END;
$$;

-- Fix approve_credit_request to properly update user credits
CREATE OR REPLACE FUNCTION public.approve_credit_request(request_id UUID, admin_notes_text TEXT DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_admin_id UUID;
  v_admin_bank INTEGER;
  v_user_exists BOOLEAN;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only admins can approve credit requests';
  END IF;
  
  SELECT * INTO v_request FROM public.credit_requests WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  SELECT approval_bank_credits INTO v_admin_bank FROM public.user_points WHERE user_id = v_admin_id;
  
  IF v_admin_bank IS NULL OR v_admin_bank < v_request.amount THEN
    RAISE EXCEPTION 'Insufficient credits in approval bank';
  END IF;
  
  UPDATE public.user_points
  SET approval_bank_credits = approval_bank_credits - v_request.amount
  WHERE user_id = v_admin_id;
  
  SELECT EXISTS(SELECT 1 FROM public.user_points WHERE user_id = v_request.user_id) INTO v_user_exists;
  
  IF v_user_exists THEN
    UPDATE public.user_points
    SET daily_points = daily_points + v_request.amount
    WHERE user_id = v_request.user_id;
  ELSE
    INSERT INTO public.user_points (user_id, daily_points, monthly_points)
    VALUES (v_request.user_id, v_request.amount + 50, 500);
  END IF;
  
  UPDATE public.credit_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      admin_notes = admin_notes_text
  WHERE id = request_id;
  
  INSERT INTO public.point_grants (admin_user_id, target_user_id, points_granted, reason)
  VALUES (v_admin_id, v_request.user_id, v_request.amount, 'Credit request approved: ' || COALESCE(v_request.reason, 'No reason provided'));
  
  INSERT INTO public.email_notifications (recipient_user_id, recipient_email, notification_type, subject, body, metadata)
  SELECT 
    v_request.user_id,
    p.email,
    'credit_approved',
    'Your credit request has been approved!',
    'Your request for ' || v_request.amount || ' credits has been approved.' || COALESCE(' Admin notes: ' || admin_notes_text, ''),
    jsonb_build_object('request_id', request_id, 'amount', v_request.amount)
  FROM public.profiles p WHERE p.user_id = v_request.user_id;
  
  RETURN true;
END;
$$;

-- Fix deny_credit_request to log email notification
CREATE OR REPLACE FUNCTION public.deny_credit_request(request_id UUID, admin_notes_text TEXT DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only admins can deny credit requests';
  END IF;
  
  SELECT * INTO v_request FROM public.credit_requests WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  UPDATE public.credit_requests
  SET status = 'denied',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      admin_notes = admin_notes_text
  WHERE id = request_id;
  
  INSERT INTO public.email_notifications (recipient_user_id, recipient_email, notification_type, subject, body, metadata)
  SELECT 
    v_request.user_id,
    p.email,
    'credit_denied',
    'Your credit request has been denied',
    'Your request for ' || v_request.amount || ' credits has been denied.' || COALESCE(' Reason: ' || admin_notes_text, ''),
    jsonb_build_object('request_id', request_id, 'amount', v_request.amount)
  FROM public.profiles p WHERE p.user_id = v_request.user_id;
  
  RETURN true;
END;
$$;

-- Function to notify all admins about new credit request
CREATE OR REPLACE FUNCTION public.notify_admins_new_credit_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester RECORD;
  v_admin RECORD;
BEGIN
  SELECT * INTO v_requester FROM public.profiles WHERE user_id = NEW.user_id;
  
  FOR v_admin IN 
    SELECT p.* FROM public.profiles p
    INNER JOIN public.user_roles ur ON p.user_id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.email_notifications (recipient_user_id, recipient_email, notification_type, subject, body, metadata)
    VALUES (
      v_admin.user_id,
      v_admin.email,
      'new_credit_request',
      'New Credit Request from ' || COALESCE(v_requester.full_name, 'Unknown User'),
      'New credit request received:' || E'\n' ||
      'Name: ' || COALESCE(v_requester.full_name, 'N/A') || E'\n' ||
      'Username: ' || COALESCE(v_requester.username, 'N/A') || E'\n' ||
      'Email: ' || COALESCE(v_requester.email, 'N/A') || E'\n' ||
      'Amount Requested: ' || NEW.amount || E'\n' ||
      'Reason: ' || COALESCE(NEW.reason, 'No reason provided'),
      jsonb_build_object(
        'request_id', NEW.id,
        'requester_user_id', NEW.user_id,
        'requester_name', v_requester.full_name,
        'requester_username', v_requester.username,
        'requester_email', v_requester.email,
        'amount', NEW.amount
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new credit requests
DROP TRIGGER IF EXISTS on_new_credit_request ON public.credit_requests;
CREATE TRIGGER on_new_credit_request
  AFTER INSERT ON public.credit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_credit_request();

-- Function to check profile completion
CREATE OR REPLACE FUNCTION public.is_profile_complete(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF v_profile.full_name IS NULL OR v_profile.full_name = '' OR v_profile.age IS NULL OR v_profile.age <= 0 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

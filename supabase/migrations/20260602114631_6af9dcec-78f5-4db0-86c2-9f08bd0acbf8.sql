
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id text; v_exists boolean;
BEGIN
  LOOP
    v_id := 'SM' || lpad(floor(random()*1000000)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.employee_id_cards WHERE employee_id = v_id)
        OR EXISTS(SELECT 1 FROM public.employee_ids WHERE employee_id = v_id) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_id_card_for_employee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_emp text; v_name text; v_email text;
BEGIN
  IF NEW.role <> 'employee' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.employee_id_cards WHERE employee_user_id = NEW.user_id) THEN RETURN NEW; END IF;
  v_emp := public.generate_employee_id();
  INSERT INTO public.employee_ids (employee_id, generated_by, is_used, assigned_to)
    VALUES (v_emp, NEW.user_id, true, NEW.user_id);
  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.employee_id_cards (employee_user_id, employee_id, full_name, is_ceo)
  VALUES (NEW.user_id, v_emp, COALESCE(v_name,'Employee'), v_email = 'kchetasswaroop@gmail.com');
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_create_id_card(p_user_id uuid, p_designation text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_emp text; v_name text; v_email text; v_card_id uuid; v_existing uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can create ID cards';
  END IF;
  SELECT id INTO v_existing FROM public.employee_id_cards WHERE employee_user_id = p_user_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  v_emp := public.generate_employee_id();
  INSERT INTO public.employee_ids (employee_id, generated_by, is_used, assigned_to)
    VALUES (v_emp, auth.uid(), true, p_user_id);
  SELECT full_name, email INTO v_name, v_email FROM public.profiles WHERE user_id = p_user_id;
  INSERT INTO public.employee_id_cards (employee_user_id, employee_id, full_name, is_ceo, designation, created_by)
    VALUES (p_user_id, v_emp, COALESCE(v_name,'Employee'), v_email = 'kchetasswaroop@gmail.com', p_designation, auth.uid())
    RETURNING id INTO v_card_id;
  RETURN v_card_id;
END; $$;

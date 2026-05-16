
-- Set company logo
UPDATE public.id_card_assets SET logo_url = '/stackmind-logo.png', updated_at = now()
WHERE id = (SELECT id FROM public.id_card_assets ORDER BY updated_at DESC LIMIT 1);
INSERT INTO public.id_card_assets (logo_url)
SELECT '/stackmind-logo.png'
WHERE NOT EXISTS (SELECT 1 FROM public.id_card_assets);

-- Ensure CEO ID Card exists for super-admin
DO $$
DECLARE v_uid uuid; v_name text;
BEGIN
  SELECT user_id, full_name INTO v_uid, v_name FROM public.profiles WHERE email = 'kchetasswaroop@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.employee_id_cards WHERE employee_user_id = v_uid) THEN
      INSERT INTO public.employee_id_cards (employee_user_id, employee_id, full_name, designation, is_ceo)
      VALUES (v_uid, 'SM-CEO-00001', COALESCE(v_name, 'Chetas Swaroop Karnam'), 'Chief Executive Officer', true);
    ELSE
      UPDATE public.employee_id_cards
        SET is_ceo = true,
            designation = 'Chief Executive Officer',
            employee_id = 'SM-CEO-00001',
            full_name = COALESCE(v_name, full_name)
        WHERE employee_user_id = v_uid;
    END IF;
  END IF;
END $$;

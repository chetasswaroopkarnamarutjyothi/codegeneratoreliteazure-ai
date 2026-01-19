
-- Make Yashas Prasanth an admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('36e59817-4557-4ecb-8d8d-9d3c723d001c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update their credits to admin level
UPDATE public.user_points
SET daily_points = 885000,
    monthly_points = 9185000,
    approval_bank_credits = 285000
WHERE user_id = '36e59817-4557-4ecb-8d8d-9d3c723d001c';

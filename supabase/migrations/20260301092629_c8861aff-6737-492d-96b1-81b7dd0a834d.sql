-- Add credits_bank column for admin flexible transfers
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS credits_bank integer DEFAULT 0;

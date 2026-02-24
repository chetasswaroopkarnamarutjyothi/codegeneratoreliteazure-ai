
-- Add employee status fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS designation text DEFAULT null,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'available',
ADD COLUMN IF NOT EXISTS status_message text DEFAULT null,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS ooo_until timestamp with time zone DEFAULT null;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: employees/admins can upload
CREATE POLICY "Employees can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' 
  AND (
    public.has_role(auth.uid(), 'employee') 
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Storage policy: anyone authenticated can view
CREATE POLICY "Authenticated users can view chat files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

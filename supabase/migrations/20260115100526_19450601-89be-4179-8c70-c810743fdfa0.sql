-- Create admin roles for specified emails
-- First, we need to find users by email and add admin role

-- Add username column to profiles for login by username
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free';

-- Update user_points table to accommodate new credit system
ALTER TABLE public.user_points 
ADD COLUMN IF NOT EXISTS approval_bank_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_credits INTEGER DEFAULT 0;

-- Update the default values for admin daily/monthly points
-- 285000 daily for admin, 8100000 monthly, 85000 approval bank

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create project collaborators table for team projects
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_collaborators
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for project collaborators
CREATE POLICY "Users can view collaborations they are part of"
ON public.project_collaborators
FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() = invited_by OR
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can add collaborators"
ON public.project_collaborators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can remove collaborators"
ON public.project_collaborators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND user_id = auth.uid()
  )
);

-- Also allow collaborators to view projects they are added to
CREATE POLICY "Collaborators can view shared projects"
ON public.projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = id AND user_id = auth.uid()
  )
);

-- Create trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique username
CREATE OR REPLACE FUNCTION public.generate_username(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Clean the base name and create initial username
  new_username := lower(regexp_replace(base_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- If empty, use 'user'
  IF new_username = '' THEN
    new_username := 'user';
  END IF;
  
  -- Add random suffix
  new_username := new_username || '_' || floor(random() * 10000)::text;
  
  -- Check if exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := lower(regexp_replace(base_name, '[^a-zA-Z0-9]', '', 'g')) || '_' || floor(random() * 100000)::text;
  END LOOP;
  
  RETURN new_username;
END;
$$;
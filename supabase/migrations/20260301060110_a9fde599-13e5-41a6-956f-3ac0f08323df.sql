
-- Fix infinite recursion: create security definer function for collaborator check
CREATE OR REPLACE FUNCTION public.is_project_collaborator(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_collaborators
    WHERE project_id = p_project_id AND user_id = p_user_id
  )
$$;

-- Drop all existing projects policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Collaborators can view shared projects" ON public.projects;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can view shared projects"
ON public.projects FOR SELECT
TO authenticated
USING (public.is_project_collaborator(id, auth.uid()));

CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also fix project_collaborators to avoid recursion from the other side
DROP POLICY IF EXISTS "Users can view collaborations they are part of" ON public.project_collaborators;
DROP POLICY IF EXISTS "Project owners can add collaborators" ON public.project_collaborators;
DROP POLICY IF EXISTS "Project owners can remove collaborators" ON public.project_collaborators;

-- Function to check project ownership without hitting projects RLS
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  )
$$;

CREATE POLICY "Users can view collaborations they are part of"
ON public.project_collaborators FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR auth.uid() = invited_by 
  OR public.is_project_owner(project_id, auth.uid())
);

CREATE POLICY "Project owners can add collaborators"
ON public.project_collaborators FOR INSERT
TO authenticated
WITH CHECK (public.is_project_owner(project_id, auth.uid()));

CREATE POLICY "Project owners can remove collaborators"
ON public.project_collaborators FOR DELETE
TO authenticated
USING (public.is_project_owner(project_id, auth.uid()));

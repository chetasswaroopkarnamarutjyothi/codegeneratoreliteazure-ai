-- Fix the broken RLS policy for shared projects
DROP POLICY IF EXISTS "Collaborators can view shared projects" ON public.projects;

CREATE POLICY "Collaborators can view shared projects" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = projects.id 
      AND pc.user_id = auth.uid()
    )
  );

-- Add admin policy to view usage history for all users
DROP POLICY IF EXISTS "Admins can view all usage history" ON public.usage_history;

CREATE POLICY "Admins can view all usage history" ON public.usage_history
  FOR SELECT USING (public.is_admin(auth.uid()));
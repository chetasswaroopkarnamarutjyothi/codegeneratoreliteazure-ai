
-- Create a security definer function to check channel membership without recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_channel_members
    WHERE channel_id = p_channel_id
      AND user_id = p_user_id
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view channel members" ON public.chat_channel_members;

-- Recreate using the security definer function
CREATE POLICY "Members can view channel members"
ON public.chat_channel_members
FOR SELECT
TO authenticated
USING (
  public.is_channel_member(channel_id, auth.uid())
  OR public.is_super_admin(auth.uid())
);

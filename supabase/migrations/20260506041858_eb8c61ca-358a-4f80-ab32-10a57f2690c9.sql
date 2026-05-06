
-- Project management (admin only)
CREATE TABLE public.pm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'active',
  lead_user_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text,
  status text NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES public.pm_sprints(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  task_type text NOT NULL DEFAULT 'task',
  assignee_user_id uuid,
  reporter_user_id uuid,
  story_points integer,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pm_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pm_projects" ON public.pm_projects
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage pm_sprints" ON public.pm_sprints
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage pm_tasks" ON public.pm_tasks
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage pm_comments" ON public.pm_comments
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER pm_projects_updated BEFORE UPDATE ON public.pm_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pm_sprints_updated BEFORE UPDATE ON public.pm_sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pm_tasks_updated BEFORE UPDATE ON public.pm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Install events with credit deduction
CREATE TABLE public.app_install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  device_info text,
  credits_deducted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_install_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own install" ON public.app_install_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own install" ON public.app_install_events
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.deduct_install_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily integer;
  v_monthly integer;
  v_cost integer := 200;
  v_already integer;
BEGIN
  -- one-time deduction per user
  SELECT count(*) INTO v_already FROM public.app_install_events
    WHERE user_id = NEW.user_id AND credits_deducted > 0;
  IF v_already > 0 THEN
    NEW.credits_deducted := 0;
    RETURN NEW;
  END IF;

  SELECT daily_points, monthly_points INTO v_daily, v_monthly
    FROM public.user_points WHERE user_id = NEW.user_id;

  IF (COALESCE(v_daily,0) + COALESCE(v_monthly,0)) < v_cost THEN
    RAISE EXCEPTION 'Insufficient credits to install StackCodeNova AI (need 200)';
  END IF;

  IF v_daily >= v_cost THEN
    UPDATE public.user_points SET daily_points = daily_points - v_cost
      WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.user_points
      SET monthly_points = monthly_points - (v_cost - v_daily),
          daily_points = 0
      WHERE user_id = NEW.user_id;
  END IF;

  NEW.credits_deducted := v_cost;
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_install_deduct
  BEFORE INSERT ON public.app_install_events
  FOR EACH ROW EXECUTE FUNCTION public.deduct_install_credits();

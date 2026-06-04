import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// CEO is the ONLY user exempt from mandatory office swipe
const CEO_EMAIL = "kchetasswaroop@gmail.com";

/** Forces admin/employee to perform a daily office swipe before accessing the app. CEO is exempt. */
export function SwipeGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setReady(true); return; }

      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase.from("profiles").select("email").eq("user_id", session.user.id).single(),
      ]);

      // CEO and all admins bypass the swipe gate — only employees must swipe
      if (profile?.email === CEO_EMAIL) { setReady(true); return; }
      const isAdmin = roles?.some(r => r.role === "admin");
      if (isAdmin) { setReady(true); return; }

      const needsSwipe = roles?.some(r => r.role === "employee");
      if (!needsSwipe) { setReady(true); return; }

      const today = new Date().toISOString().slice(0, 10);
      const { data: swipe } = await supabase
        .from("office_swipes").select("id")
        .eq("user_id", session.user.id).eq("swipe_date", today).maybeSingle();

      if (!swipe) {
        navigate("/swipe-in");
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  if (!ready) return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  return <>{children}</>;
}

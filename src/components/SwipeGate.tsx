import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SWIPE_CACHE_PREFIX = "swipe_gate_access:";

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const readCachedSwipeDecision = (userId: string) => {
  const raw = sessionStorage.getItem(`${SWIPE_CACHE_PREFIX}${userId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { date: string; allowed: boolean };
    return parsed.date === getTodayKey() ? parsed.allowed : null;
  } catch {
    sessionStorage.removeItem(`${SWIPE_CACHE_PREFIX}${userId}`);
    return null;
  }
};

const cacheSwipeDecision = (userId: string, allowed: boolean) => {
  sessionStorage.setItem(
    `${SWIPE_CACHE_PREFIX}${userId}`,
    JSON.stringify({ date: getTodayKey(), allowed })
  );
};

/** Forces employees to perform a daily office swipe before accessing the app. Admins bypass it. */
export function SwipeGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) { setReady(true); return; }

      const cachedDecision = readCachedSwipeDecision(session.user.id);
      if (cachedDecision) {
        setReady(true);
        return;
      }

      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!active) return;

      const roleList = roles?.map((entry) => entry.role) ?? [];
      const isAdmin = roleList.includes("admin");

      if (roleError || isAdmin || !roleList.includes("employee")) {
        cacheSwipeDecision(session.user.id, true);
        setReady(true);
        return;
      }

      const { data: swipe } = await supabase
        .from("office_swipes").select("id")
        .eq("user_id", session.user.id)
        .eq("swipe_date", getTodayKey())
        .maybeSingle();

      if (!active) return;

      if (!swipe) {
        navigate("/swipe-in");
        return;
      }

      cacheSwipeDecision(session.user.id, true);
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  return <>{children}</>;
}

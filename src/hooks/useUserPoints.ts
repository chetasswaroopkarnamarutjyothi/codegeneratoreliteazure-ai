import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPoints {
  id: string;
  user_id: string;
  daily_points: number;
  monthly_points: number;
  last_daily_reset: string;
  last_monthly_reset: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
}

export function useUserPoints(userId: string | undefined) {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();

      if (data && !error) {
        setIsAdmin(true);
      }
    } catch {
      // Not an admin
    }
  }, [userId]);

  const fetchPoints = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Check if daily reset is needed
      if (data) {
        const today = new Date().toISOString().split("T")[0];
        const lastDailyReset = data.last_daily_reset;

        if (lastDailyReset !== today) {
          // Reset daily points
          const defaultDaily = isAdmin ? 500 : 50;
          const { data: updatedData, error: updateError } = await supabase
            .from("user_points")
            .update({
              daily_points: defaultDaily,
              last_daily_reset: today,
            })
            .eq("user_id", userId)
            .select()
            .single();

          if (!updateError && updatedData) {
            setPoints(updatedData);
            return;
          }
        }

        // Check if monthly reset is needed
        const currentMonth = today.slice(0, 7);
        const lastMonthlyReset = data.last_monthly_reset.slice(0, 7);

        if (currentMonth !== lastMonthlyReset && isAdmin) {
          const { data: updatedData, error: updateError } = await supabase
            .from("user_points")
            .update({
              monthly_points: 8500,
              last_monthly_reset: today,
            })
            .eq("user_id", userId)
            .select()
            .single();

          if (!updateError && updatedData) {
            setPoints(updatedData);
            return;
          }
        }
      }

      setPoints(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const deductPoints = async (amount: number = 5): Promise<{ success: boolean; error?: string }> => {
    if (!userId || !points) {
      return { success: false, error: "No user or points data" };
    }

    // Check if user has enough points
    const totalAvailable = points.daily_points + (isAdmin ? points.monthly_points : 0);
    
    if (totalAvailable < amount) {
      return { success: false, error: "Insufficient points. Please upgrade to premium." };
    }

    try {
      let newDailyPoints = points.daily_points;
      let newMonthlyPoints = points.monthly_points;

      if (points.daily_points >= amount) {
        newDailyPoints = points.daily_points - amount;
      } else if (isAdmin) {
        // Use monthly points for admin
        const remaining = amount - points.daily_points;
        newDailyPoints = 0;
        newMonthlyPoints = points.monthly_points - remaining;
      } else {
        return { success: false, error: "Insufficient points. Please upgrade to premium." };
      }

      const { error } = await supabase
        .from("user_points")
        .update({
          daily_points: newDailyPoints,
          monthly_points: newMonthlyPoints,
        })
        .eq("user_id", userId);

      if (error) throw error;

      setPoints({
        ...points,
        daily_points: newDailyPoints,
        monthly_points: newMonthlyPoints,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const getTotalPoints = () => {
    if (!points) return 0;
    return points.daily_points + (isAdmin ? points.monthly_points : 0);
  };

  return { 
    points, 
    loading, 
    error, 
    isAdmin, 
    deductPoints, 
    getTotalPoints,
    refetch: fetchPoints 
  };
}

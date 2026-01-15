import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPoints {
  id: string;
  user_id: string;
  daily_points: number;
  monthly_points: number;
  approval_bank_credits: number;
  reserved_credits: number;
  last_daily_reset: string;
  last_monthly_reset: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  created_at: string;
}

// Admin credits: 285,000 daily, 81,00,000 (8,100,000) monthly, 85,000 approval bank
const ADMIN_DAILY_CREDITS = 285000;
const ADMIN_MONTHLY_CREDITS = 8100000;
const ADMIN_APPROVAL_BANK = 85000;

// Regular user credits
const USER_DAILY_CREDITS = 50;

// Pro subscription credits
const PRO_CREDITS = 100;
const PRO_PLUS_CREDITS = 200;

export function useUserPoints(userId: string | undefined) {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<string>("free");

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

      // Check subscription type from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("subscription_type")
        .eq("user_id", userId)
        .single();

      if (profileData?.subscription_type) {
        setSubscriptionType(profileData.subscription_type);
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
          // Reset daily points - NO ROLLOVER
          let defaultDaily = USER_DAILY_CREDITS;
          
          if (isAdmin) {
            defaultDaily = ADMIN_DAILY_CREDITS;
          } else if (subscriptionType === "pro_plus") {
            defaultDaily = PRO_PLUS_CREDITS;
          } else if (subscriptionType === "pro") {
            defaultDaily = PRO_CREDITS;
          }

          const updatePayload: any = {
            daily_points: defaultDaily,
            last_daily_reset: today,
          };

          const { data: updatedData, error: updateError } = await supabase
            .from("user_points")
            .update(updatePayload)
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
              monthly_points: ADMIN_MONTHLY_CREDITS,
              approval_bank_credits: ADMIN_APPROVAL_BANK,
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
  }, [userId, isAdmin, subscriptionType]);

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
      return { success: false, error: "Insufficient Azure AI Power Credits. Please upgrade to Pro or Pro+." };
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
        return { success: false, error: "Insufficient Azure AI Power Credits. Please upgrade to Pro or Pro+." };
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

  const transferToApprovalBank = async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!userId || !points || !isAdmin) {
      return { success: false, error: "Only admins can transfer to approval bank" };
    }

    if (points.daily_points < amount) {
      return { success: false, error: "Insufficient daily credits" };
    }

    try {
      const { error } = await supabase
        .from("user_points")
        .update({
          daily_points: points.daily_points - amount,
          approval_bank_credits: (points.approval_bank_credits || 0) + amount,
        })
        .eq("user_id", userId);

      if (error) throw error;

      setPoints({
        ...points,
        daily_points: points.daily_points - amount,
        approval_bank_credits: (points.approval_bank_credits || 0) + amount,
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
    subscriptionType,
    deductPoints, 
    getTotalPoints,
    transferToApprovalBank,
    refetch: fetchPoints,
    ADMIN_DAILY_CREDITS,
    ADMIN_MONTHLY_CREDITS,
    ADMIN_APPROVAL_BANK,
    USER_DAILY_CREDITS,
    PRO_CREDITS,
    PRO_PLUS_CREDITS
  };
}

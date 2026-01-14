import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UsageHistoryItem {
  id: string;
  user_id: string;
  action_type: string;
  prompt: string | null;
  result: string | null;
  language: string | null;
  points_used: number | null;
  created_at: string;
}

export function useUsageHistory(userId: string | undefined) {
  const [history, setHistory] = useState<UsageHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("usage_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setHistory(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addHistoryItem = async (item: {
    action_type: string;
    prompt?: string;
    result?: string;
    language?: string;
    points_used?: number;
  }) => {
    if (!userId) return { error: "No user ID" };

    try {
      const { data, error } = await supabase
        .from("usage_history")
        .insert({
          user_id: userId,
          action_type: item.action_type,
          prompt: item.prompt || null,
          result: item.result || null,
          language: item.language || null,
          points_used: item.points_used ?? 5,
        })
        .select()
        .single();

      if (error) throw error;

      setHistory((prev) => [data, ...prev]);
      return { error: null, data };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return { history, loading, error, addHistoryItem, refetch: fetchHistory };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  age: number;
  parent_email: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, "id" | "user_id" | "age" | "created_at" | "updated_at">>) => {
    if (!userId || !profile) return { error: "No profile found" };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) throw error;

      setProfile({ ...profile, ...updates });
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const createProfile = async (profileData: {
    email: string;
    full_name: string;
    age: number;
    parent_email?: string;
  }) => {
    if (!userId) return { error: "No user ID" };

    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          email: profileData.email,
          full_name: profileData.full_name,
          age: profileData.age,
          parent_email: profileData.parent_email || null,
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return { error: null, data };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return { profile, loading, error, updateProfile, createProfile, refetch: () => {
    if (userId) {
      setLoading(true);
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single()
        .then(({ data }) => {
          setProfile(data);
          setLoading(false);
        });
    }
  }};
}

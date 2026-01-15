export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          plan_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          plan_type: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          plan_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      point_grants: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          points_granted: number
          reason: string | null
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          points_granted: number
          reason?: string | null
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          points_granted?: number
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number
          avatar_updated_at: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_blocked: boolean | null
          parent_email: string | null
          subscription_type: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          age: number
          avatar_updated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_blocked?: boolean | null
          parent_email?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          age?: number
          avatar_updated_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean | null
          parent_email?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          language: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_history: {
        Row: {
          action_type: string
          created_at: string
          id: string
          language: string | null
          points_used: number | null
          prompt: string | null
          result: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          language?: string | null
          points_used?: number | null
          prompt?: string | null
          result?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          language?: string | null
          points_used?: number | null
          prompt?: string | null
          result?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          approval_bank_credits: number | null
          created_at: string
          daily_points: number
          id: string
          is_premium: boolean | null
          last_daily_reset: string
          last_monthly_reset: string
          monthly_points: number
          premium_expires_at: string | null
          reserved_credits: number | null
          user_id: string
        }
        Insert: {
          approval_bank_credits?: number | null
          created_at?: string
          daily_points?: number
          id?: string
          is_premium?: boolean | null
          last_daily_reset?: string
          last_monthly_reset?: string
          monthly_points?: number
          premium_expires_at?: string | null
          reserved_credits?: number | null
          user_id: string
        }
        Update: {
          approval_bank_credits?: number | null
          created_at?: string
          daily_points?: number
          id?: string
          is_premium?: boolean | null
          last_daily_reset?: string
          last_monthly_reset?: string
          monthly_points?: number
          premium_expires_at?: string | null
          reserved_credits?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_username: { Args: { base_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "premium"],
    },
  },
} as const

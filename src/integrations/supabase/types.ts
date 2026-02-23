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
      admin_management: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_temporary: boolean | null
          managed_by: string
          notes: string | null
          target_user_id: string
          temp_expires_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_temporary?: boolean | null
          managed_by: string
          notes?: string | null
          target_user_id: string
          temp_expires_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_temporary?: boolean | null
          managed_by?: string
          notes?: string | null
          target_user_id?: string
          temp_expires_at?: string | null
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message_type: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          body: string
          id: string
          metadata: Json | null
          notification_type: string
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string
          subject: string
        }
        Insert: {
          body: string
          id?: string
          metadata?: Json | null
          notification_type: string
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string
          subject: string
        }
        Update: {
          body?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
      employee_ldap: {
        Row: {
          created_at: string
          id: string
          ldap_verified_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ldap_verified_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ldap_verified_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_terminations: {
        Row: {
          created_at: string
          employee_user_id: string
          id: string
          reason: string
          terminated_at: string
          terminated_by: string
        }
        Insert: {
          created_at?: string
          employee_user_id: string
          id?: string
          reason: string
          terminated_at?: string
          terminated_by: string
        }
        Update: {
          created_at?: string
          employee_user_id?: string
          id?: string
          reason?: string
          terminated_at?: string
          terminated_by?: string
        }
        Relationships: []
      }
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
      qr_login_tokens: {
        Row: {
          authenticated_at: string | null
          created_at: string
          expires_at: string
          id: string
          status: string
          token: string
          user_id: string | null
        }
        Insert: {
          authenticated_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          token: string
          user_id?: string | null
        }
        Update: {
          authenticated_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_chat_access: {
        Row: {
          access_type: string
          amount_paid: number
          channel_id: string | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean | null
          issue_resolved: boolean | null
          priority_level: number | null
          starts_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          amount_paid: number
          channel_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          issue_resolved?: boolean | null
          priority_level?: number | null
          starts_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          amount_paid?: number
          channel_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          issue_resolved?: boolean | null
          priority_level?: number | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_access_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          created_at: string
          description: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          ticket_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          description: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          ticket_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          description?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          ticket_type?: string
          title?: string
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
      user_penalties: {
        Row: {
          created_at: string
          daily_credit_reduction: number
          id: string
          is_active: boolean
          penalty_end_date: string
          penalty_start_date: string
          penalty_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_credit_reduction?: number
          id?: string
          is_active?: boolean
          penalty_end_date?: string
          penalty_start_date?: string
          penalty_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_credit_reduction?: number
          id?: string
          is_active?: boolean
          penalty_end_date?: string
          penalty_start_date?: string
          penalty_type?: string
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
      approve_credit_request: {
        Args: { admin_notes_text?: string; request_id: string }
        Returns: boolean
      }
      assign_random_admin_from_group: { Args: never; Returns: undefined }
      deny_credit_request: {
        Args: { admin_notes_text?: string; request_id: string }
        Returns: boolean
      }
      generate_username: { Args: { base_name: string }; Returns: string }
      grant_admin_role: {
        Args: {
          p_expires_at?: string
          p_is_temporary?: boolean
          p_notes?: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      grant_credits_from_bank: {
        Args: { amount: number; grant_reason?: string; target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_profile_complete: { Args: { p_user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      reset_daily_credits_with_penalties: { Args: never; Returns: undefined }
      resolve_ticket: {
        Args: {
          p_admin_response?: string
          p_status: string
          p_ticket_id: string
        }
        Returns: boolean
      }
      revoke_admin_role: {
        Args: { p_notes?: string; p_target_user_id: string }
        Returns: boolean
      }
      transfer_to_approval_bank: { Args: { amount: number }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "premium" | "employee"
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
      app_role: ["admin", "user", "premium", "employee"],
    },
  },
} as const

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
      account_restore_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          email: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          temp_password: string | null
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          email: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          temp_password?: string | null
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          temp_password?: string | null
        }
        Relationships: []
      }
      admin_credit_allocations: {
        Row: {
          admin_user_id: string
          allocation_date: string
          created_at: string
          credits_allocated: number
          id: string
        }
        Insert: {
          admin_user_id: string
          allocation_date?: string
          created_at?: string
          credits_allocated?: number
          id?: string
        }
        Update: {
          admin_user_id?: string
          allocation_date?: string
          created_at?: string
          credits_allocated?: number
          id?: string
        }
        Relationships: []
      }
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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          priority: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          priority?: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          priority?: string
          published_at?: string | null
          title?: string
          updated_at?: string
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
      company_bank_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string | null
          created_at: string
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          notes: string | null
          swift_code: string | null
          updated_at: string
          updated_by: string | null
          upi_id: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          notes?: string | null
          swift_code?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          created_at?: string
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          notes?: string | null
          swift_code?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
        }
        Relationships: []
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
      employee_ids: {
        Row: {
          assigned_to: string | null
          created_at: string
          employee_id: string
          generated_by: string
          id: string
          is_used: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          employee_id: string
          generated_by: string
          id?: string
          is_used?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          employee_id?: string
          generated_by?: string
          id?: string
          is_used?: boolean | null
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
      enterprise_members: {
        Row: {
          created_at: string
          enterprise_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enterprise_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enterprise_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_members_enterprise_id_fkey"
            columns: ["enterprise_id"]
            isOneToOne: false
            referencedRelation: "enterprises"
            referencedColumns: ["id"]
          },
        ]
      }
      enterprises: {
        Row: {
          contact_email: string | null
          created_at: string
          credit_pool: number | null
          credits_used: number | null
          employee_count: number | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          credit_pool?: number | null
          credits_used?: number | null
          employee_count?: number | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          credit_pool?: number | null
          credits_used?: number | null
          employee_count?: number | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          rating: number | null
          responded_at: string | null
          responded_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      model_credit_costs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          model_id: string
          model_label: string
          professional_multiplier: number
          standard_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_id: string
          model_label: string
          professional_multiplier?: number
          standard_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_id?: string
          model_label?: string
          professional_multiplier?: number
          standard_cost?: number
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
      professional_code_usage: {
        Row: {
          credits_used: number | null
          id: string
          language: string | null
          prompt: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          credits_used?: number | null
          id?: string
          language?: string | null
          prompt?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          credits_used?: number | null
          id?: string
          language?: string | null
          prompt?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number
          avatar_updated_at: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          designation: string | null
          email: string
          full_name: string
          id: string
          is_blocked: boolean | null
          last_active_at: string | null
          ooo_until: string | null
          parent_email: string | null
          status: string | null
          status_message: string | null
          subscription_type: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          age: number
          avatar_updated_at?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          designation?: string | null
          email: string
          full_name: string
          id?: string
          is_blocked?: boolean | null
          last_active_at?: string | null
          ooo_until?: string | null
          parent_email?: string | null
          status?: string | null
          status_message?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          age?: number
          avatar_updated_at?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          full_name?: string
          id?: string
          is_blocked?: boolean | null
          last_active_at?: string | null
          ooo_until?: string | null
          parent_email?: string | null
          status?: string | null
          status_message?: string | null
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
      school_class_monitors: {
        Row: {
          assigned_by: string
          class_id: string
          created_at: string
          id: string
          is_active: boolean | null
          month_year: string
          student_user_id: string
        }
        Insert: {
          assigned_by: string
          class_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          month_year: string
          student_user_id: string
        }
        Update: {
          assigned_by?: string
          class_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          month_year?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_class_monitors_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          class_name: string
          created_at: string
          credit_pool: number | null
          credits_used: number | null
          id: string
          school_id: string
          section: string
          teacher_user_id: string | null
          updated_at: string
        }
        Insert: {
          class_name: string
          created_at?: string
          credit_pool?: number | null
          credits_used?: number | null
          id?: string
          school_id: string
          section: string
          teacher_user_id?: string | null
          updated_at?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          credit_pool?: number | null
          credits_used?: number | null
          id?: string
          school_id?: string
          section?: string
          teacher_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          admission_no: string | null
          approved_at: string | null
          approved_by: string | null
          class_id: string | null
          class_name: string | null
          created_at: string
          full_name: string
          id: string
          is_approved: boolean | null
          school_id: string
          school_role: string
          section: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admission_no?: string | null
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_approved?: boolean | null
          school_id: string
          school_role?: string
          section?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admission_no?: string | null
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_approved?: boolean | null
          school_id?: string
          school_role?: string
          section?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_organizations: {
        Row: {
          created_at: string
          domain_pattern: string
          id: string
          is_pre_approved: boolean | null
          name: string
          teacher_domain_pattern: string | null
          total_credits_per_class: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain_pattern: string
          id?: string
          is_pre_approved?: boolean | null
          name: string
          teacher_domain_pattern?: string | null
          total_credits_per_class?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain_pattern?: string
          id?: string
          is_pre_approved?: boolean | null
          name?: string
          teacher_domain_pattern?: string | null
          total_credits_per_class?: number | null
          updated_at?: string
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
      user_bank_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string | null
          notes: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code?: string | null
          notes?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string | null
          notes?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_language_preference: {
        Row: {
          id: string
          language_code: string
          set_at: string
          user_id: string
        }
        Insert: {
          id?: string
          language_code?: string
          set_at?: string
          user_id: string
        }
        Update: {
          id?: string
          language_code?: string
          set_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_layout_preferences: {
        Row: {
          accent_color: string | null
          created_at: string
          density: string | null
          font_family: string | null
          font_size: string | null
          id: string
          sidebar_position: string | null
          theme_variant: string | null
          updated_at: string
          user_id: string
          widget_order: Json | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          density?: string | null
          font_family?: string | null
          font_size?: string | null
          id?: string
          sidebar_position?: string | null
          theme_variant?: string | null
          updated_at?: string
          user_id: string
          widget_order?: Json | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          density?: string | null
          font_family?: string | null
          font_size?: string | null
          id?: string
          sidebar_position?: string | null
          theme_variant?: string | null
          updated_at?: string
          user_id?: string
          widget_order?: Json | null
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
          birthday_credits_expire_at: string | null
          birthday_credits_granted_at: string | null
          created_at: string
          credits_bank: number | null
          custom_daily_limit: number | null
          daily_points: number
          half_year_penalty_applied_at: string | null
          half_year_usage_count: number | null
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
          birthday_credits_expire_at?: string | null
          birthday_credits_granted_at?: string | null
          created_at?: string
          credits_bank?: number | null
          custom_daily_limit?: number | null
          daily_points?: number
          half_year_penalty_applied_at?: string | null
          half_year_usage_count?: number | null
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
          birthday_credits_expire_at?: string | null
          birthday_credits_granted_at?: string | null
          created_at?: string
          credits_bank?: number | null
          custom_daily_limit?: number | null
          daily_points?: number
          half_year_penalty_applied_at?: string | null
          half_year_usage_count?: number | null
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
      website_controls: {
        Row: {
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          banner_enabled: boolean | null
          banner_message: string | null
          banner_type: string | null
          captcha_enabled: boolean | null
          custom_logo_url: string | null
          default_theme: string | null
          email_notifications_enabled: boolean | null
          feature_ai_enabled: boolean | null
          feature_chat_enabled: boolean | null
          feature_ide_enabled: boolean | null
          feature_projects_enabled: boolean | null
          font_size_default: string | null
          free_credits_amount: number | null
          free_credits_enabled: boolean | null
          free_credits_end_date: string | null
          id: string
          ip_blocking_enabled: boolean | null
          maintenance_message: string | null
          maintenance_mode: boolean | null
          max_login_attempts: number | null
          max_message_length: number | null
          max_upload_size_mb: number | null
          primary_color_override: string | null
          profanity_filter_enabled: boolean | null
          push_notifications_enabled: boolean | null
          rate_limit_enabled: boolean | null
          rate_limit_max_requests: number | null
          registration_enabled: boolean | null
          session_timeout_minutes: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          banner_enabled?: boolean | null
          banner_message?: string | null
          banner_type?: string | null
          captcha_enabled?: boolean | null
          custom_logo_url?: string | null
          default_theme?: string | null
          email_notifications_enabled?: boolean | null
          feature_ai_enabled?: boolean | null
          feature_chat_enabled?: boolean | null
          feature_ide_enabled?: boolean | null
          feature_projects_enabled?: boolean | null
          font_size_default?: string | null
          free_credits_amount?: number | null
          free_credits_enabled?: boolean | null
          free_credits_end_date?: string | null
          id?: string
          ip_blocking_enabled?: boolean | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          max_login_attempts?: number | null
          max_message_length?: number | null
          max_upload_size_mb?: number | null
          primary_color_override?: string | null
          profanity_filter_enabled?: boolean | null
          push_notifications_enabled?: boolean | null
          rate_limit_enabled?: boolean | null
          rate_limit_max_requests?: number | null
          registration_enabled?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          banner_enabled?: boolean | null
          banner_message?: string | null
          banner_type?: string | null
          captcha_enabled?: boolean | null
          custom_logo_url?: string | null
          default_theme?: string | null
          email_notifications_enabled?: boolean | null
          feature_ai_enabled?: boolean | null
          feature_chat_enabled?: boolean | null
          feature_ide_enabled?: boolean | null
          feature_projects_enabled?: boolean | null
          font_size_default?: string | null
          free_credits_amount?: number | null
          free_credits_enabled?: boolean | null
          free_credits_end_date?: string | null
          id?: string
          ip_blocking_enabled?: boolean | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          max_login_attempts?: number | null
          max_message_length?: number | null
          max_upload_size_mb?: number | null
          primary_color_override?: string | null
          profanity_filter_enabled?: boolean | null
          push_notifications_enabled?: boolean | null
          rate_limit_enabled?: boolean | null
          rate_limit_max_requests?: number | null
          registration_enabled?: boolean | null
          session_timeout_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
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
      check_half_year_usage_penalty: { Args: never; Returns: undefined }
      deny_credit_request: {
        Args: { admin_notes_text?: string; request_id: string }
        Returns: boolean
      }
      expire_birthday_credits: { Args: never; Returns: undefined }
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
      grant_birthday_credits: { Args: never; Returns: undefined }
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
      is_channel_member: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: boolean
      }
      is_profile_complete: { Args: { p_user_id: string }; Returns: boolean }
      is_project_collaborator: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
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

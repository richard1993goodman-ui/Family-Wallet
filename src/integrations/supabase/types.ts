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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_logs: {
        Row: {
          activities: string | null
          created_at: string
          family_id: string
          food: string | null
          homework: string | null
          id: string
          log_date: string
          mood: string | null
          notes: string | null
          tomorrow: string | null
        }
        Insert: {
          activities?: string | null
          created_at?: string
          family_id: string
          food?: string | null
          homework?: string | null
          id?: string
          log_date: string
          mood?: string | null
          notes?: string | null
          tomorrow?: string | null
        }
        Update: {
          activities?: string | null
          created_at?: string
          family_id?: string
          food?: string | null
          homework?: string | null
          id?: string
          log_date?: string
          mood?: string | null
          notes?: string | null
          tomorrow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          client_key: string | null
          doc_kind: string
          doc_version: string
          family_id: string
          id: string
          signed_at: string
          signer_name: string
          signer_role: string
        }
        Insert: {
          client_key?: string | null
          doc_kind: string
          doc_version?: string
          family_id: string
          id?: string
          signed_at?: string
          signer_name: string
          signer_role: string
        }
        Update: {
          client_key?: string | null
          doc_kind?: string
          doc_version?: string
          family_id?: string
          id?: string
          signed_at?: string
          signer_name?: string
          signer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          access_code: string
          access_code_hash: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          family_name: string
          id: string
          nanny_bio: string | null
          nanny_emergency_name: string | null
          nanny_emergency_phone: string | null
          nanny_emergency_relationship: string | null
          nanny_name: string | null
          nanny_photo_path: string | null
          nannytax_code: string | null
          notes: string | null
          slug: string
          start_date: string | null
          status: string
          terms_accepted_on: string | null
          tier_band: string
          updated_at: string
        }
        Insert: {
          access_code?: string
          access_code_hash: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          family_name: string
          id?: string
          nanny_bio?: string | null
          nanny_emergency_name?: string | null
          nanny_emergency_phone?: string | null
          nanny_emergency_relationship?: string | null
          nanny_name?: string | null
          nanny_photo_path?: string | null
          nannytax_code?: string | null
          notes?: string | null
          slug: string
          start_date?: string | null
          status?: string
          terms_accepted_on?: string | null
          tier_band?: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          access_code_hash?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          family_name?: string
          id?: string
          nanny_bio?: string | null
          nanny_emergency_name?: string | null
          nanny_emergency_phone?: string | null
          nanny_emergency_relationship?: string | null
          nanny_name?: string | null
          nanny_photo_path?: string | null
          nannytax_code?: string | null
          notes?: string | null
          slug?: string
          start_date?: string | null
          status?: string
          terms_accepted_on?: string | null
          tier_band?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_children: {
        Row: {
          allergies: string | null
          bedtime_routine: string | null
          created_at: string
          date_of_birth: string | null
          dietary: string | null
          dislikes: string | null
          family_id: string
          id: string
          interests: string | null
          medication: string | null
          morning_routine: string | null
          name: string
          personality: string | null
          photo_path: string | null
          school: string | null
          school_hours: string | null
          sort_order: number
          what_makes_them_tick: string | null
          year_group: string | null
        }
        Insert: {
          allergies?: string | null
          bedtime_routine?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary?: string | null
          dislikes?: string | null
          family_id: string
          id?: string
          interests?: string | null
          medication?: string | null
          morning_routine?: string | null
          name: string
          personality?: string | null
          photo_path?: string | null
          school?: string | null
          school_hours?: string | null
          sort_order?: number
          what_makes_them_tick?: string | null
          year_group?: string | null
        }
        Update: {
          allergies?: string | null
          bedtime_routine?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary?: string | null
          dislikes?: string | null
          family_id?: string
          id?: string
          interests?: string | null
          medication?: string | null
          morning_routine?: string | null
          name?: string
          personality?: string | null
          photo_path?: string | null
          school?: string | null
          school_hours?: string | null
          sort_order?: number
          what_makes_them_tick?: string | null
          year_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_contacts: {
        Row: {
          created_at: string
          family_id: string
          id: string
          name: string
          phone: string
          relationship: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          name: string
          phone: string
          relationship?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          name?: string
          phone?: string
          relationship?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_contacts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_documents: {
        Row: {
          doc_type: string
          family_id: string
          file_name: string
          id: string
          issued_on: string | null
          reference_label: string | null
          storage_path: string
          uploaded_at: string
          visibility: string
        }
        Insert: {
          doc_type: string
          family_id: string
          file_name: string
          id?: string
          issued_on?: string | null
          reference_label?: string | null
          storage_path: string
          uploaded_at?: string
          visibility?: string
        }
        Update: {
          doc_type?: string
          family_id?: string
          file_name?: string
          id?: string
          issued_on?: string | null
          reference_label?: string | null
          storage_path?: string
          uploaded_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_profile: {
        Row: {
          emergency_instructions: string | null
          family_id: string
          gp_details: string | null
          home_address: string | null
          homework_expectations: string | null
          house_rules: string | null
          id: string
          important_addresses: string | null
          medical_notes: string | null
          screen_time_rules: string | null
          updated_at: string
        }
        Insert: {
          emergency_instructions?: string | null
          family_id: string
          gp_details?: string | null
          home_address?: string | null
          homework_expectations?: string | null
          house_rules?: string | null
          id?: string
          important_addresses?: string | null
          medical_notes?: string | null
          screen_time_rules?: string | null
          updated_at?: string
        }
        Update: {
          emergency_instructions?: string | null
          family_id?: string
          gp_details?: string | null
          home_address?: string | null
          homework_expectations?: string | null
          house_rules?: string | null
          id?: string
          important_addresses?: string | null
          medical_notes?: string | null
          screen_time_rules?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_profile_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_agreements: {
        Row: {
          additional_terms: string | null
          created_at: string
          duties: string | null
          employer_names: string | null
          family_id: string
          holiday: string | null
          hourly_rate: string | null
          hours: string | null
          id: string
          issued_at: string | null
          nanny_name: string | null
          notice_period: string | null
          pay_basis: string | null
          pension: string | null
          probation: string | null
          start_date: string | null
          status: string
          updated_at: string
          version: number
          work_pattern: string | null
        }
        Insert: {
          additional_terms?: string | null
          created_at?: string
          duties?: string | null
          employer_names?: string | null
          family_id: string
          holiday?: string | null
          hourly_rate?: string | null
          hours?: string | null
          id?: string
          issued_at?: string | null
          nanny_name?: string | null
          notice_period?: string | null
          pay_basis?: string | null
          pension?: string | null
          probation?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          version?: number
          work_pattern?: string | null
        }
        Update: {
          additional_terms?: string | null
          created_at?: string
          duties?: string | null
          employer_names?: string | null
          family_id?: string
          holiday?: string | null
          hourly_rate?: string | null
          hours?: string | null
          id?: string
          issued_at?: string | null
          nanny_name?: string | null
          notice_period?: string | null
          pay_basis?: string | null
          pension?: string | null
          probation?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          version?: number
          work_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nanny_agreements_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_entries: {
        Row: {
          child_name: string | null
          created_at: string
          entry_date: string
          family_id: string
          id: string
          time_label: string | null
          title: string
        }
        Insert: {
          child_name?: string | null
          created_at?: string
          entry_date: string
          family_id: string
          id?: string
          time_label?: string | null
          title: string
        }
        Update: {
          child_name?: string | null
          created_at?: string
          entry_date?: string
          family_id?: string
          id?: string
          time_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          family_id: string
          family_unread: boolean
          id: string
          last_sender: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          family_unread?: boolean
          id?: string
          last_sender?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          family_unread?: boolean
          id?: string
          last_sender?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_threads_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attempts: {
        Row: {
          answers: Json
          certificate_ref: string
          completed_at: string
          family_id: string
          id: string
          learner_name: string
          passed: boolean
          score: number
          total: number
        }
        Insert: {
          answers?: Json
          certificate_ref: string
          completed_at?: string
          family_id: string
          id?: string
          learner_name: string
          passed?: boolean
          score: number
          total: number
        }
        Update: {
          answers?: Json
          certificate_ref?: string
          completed_at?: string
          family_id?: string
          id?: string
          learner_name?: string
          passed?: boolean
          score?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_attempts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_access_attempts: {
        Row: {
          attempted_at: string
          client_key: string
          id: string
          slug: string
          succeeded: boolean
        }
        Insert: {
          attempted_at?: string
          client_key: string
          id?: string
          slug: string
          succeeded?: boolean
        }
        Update: {
          attempted_at?: string
          client_key?: string
          id?: string
          slug?: string
          succeeded?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const

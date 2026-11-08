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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agency_challenges: {
        Row: {
          agency_id: string | null
          audience: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          agency_id?: string | null
          audience?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          agency_id?: string | null
          audience?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_challenges_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "partner_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_terms: {
        Row: {
          agency_id: string | null
          file_name: string
          id: string
          storage_path: string
          uploaded_at: string
          version: number
        }
        Insert: {
          agency_id?: string | null
          file_name: string
          id?: string
          storage_path: string
          uploaded_at?: string
          version?: number
        }
        Update: {
          agency_id?: string | null
          file_name?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_terms_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "partner_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_completions: {
        Row: {
          challenge_id: string
          completed_at: string
          completed_by: string
          family_id: string
          id: string
          note: string | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          completed_by: string
          family_id: string
          id?: string
          note?: string | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          completed_by?: string
          family_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "agency_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_completions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_recipients: {
        Row: {
          challenge_id: string
          family_id: string
          id: string
        }
        Insert: {
          challenge_id: string
          family_id: string
          id?: string
        }
        Update: {
          challenge_id?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_recipients_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "agency_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_recipients_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_requests: {
        Row: {
          children: string | null
          cover_type: string
          created_at: string
          end_date: string | null
          end_time: string | null
          family_id: string
          id: string
          location: string | null
          notes: string | null
          requested_by: string
          start_date: string
          start_time: string | null
          status: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          children?: string | null
          cover_type?: string
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          family_id: string
          id?: string
          location?: string | null
          notes?: string | null
          requested_by?: string
          start_date: string
          start_time?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          children?: string | null
          cover_type?: string
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          family_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          requested_by?: string
          start_date?: string
          start_time?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_requests_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
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
          nanny_id: string | null
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
          nanny_id?: string | null
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
          nanny_id?: string | null
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
          {
            foreignKeyName: "document_signatures_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          family_id: string
          id: string
          item: string
          nanny_id: string | null
          notes: string | null
          reviewed_at: string | null
          status: string
          submitted_by: string
          submitted_by_name: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          family_id: string
          id?: string
          item: string
          nanny_id?: string | null
          notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_by?: string
          submitted_by_name?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          family_id?: string
          id?: string
          item?: string
          nanny_id?: string | null
          notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_by?: string
          submitted_by_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
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
          fee_amount: string | null
          fee_label: string | null
          id: string
          intro_fee_percent: number | null
          nanny_bio: string | null
          nanny_code: string | null
          nanny_code_hash: string | null
          nanny_emergency_name: string | null
          nanny_emergency_phone: string | null
          nanny_emergency_relationship: string | null
          nanny_invited_at: string | null
          nanny_name: string | null
          nanny_photo_path: string | null
          nannytax_code: string | null
          notes: string | null
          partner_agency_id: string | null
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
          fee_amount?: string | null
          fee_label?: string | null
          id?: string
          intro_fee_percent?: number | null
          nanny_bio?: string | null
          nanny_code?: string | null
          nanny_code_hash?: string | null
          nanny_emergency_name?: string | null
          nanny_emergency_phone?: string | null
          nanny_emergency_relationship?: string | null
          nanny_invited_at?: string | null
          nanny_name?: string | null
          nanny_photo_path?: string | null
          nannytax_code?: string | null
          notes?: string | null
          partner_agency_id?: string | null
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
          fee_amount?: string | null
          fee_label?: string | null
          id?: string
          intro_fee_percent?: number | null
          nanny_bio?: string | null
          nanny_code?: string | null
          nanny_code_hash?: string | null
          nanny_emergency_name?: string | null
          nanny_emergency_phone?: string | null
          nanny_emergency_relationship?: string | null
          nanny_invited_at?: string | null
          nanny_name?: string | null
          nanny_photo_path?: string | null
          nannytax_code?: string | null
          notes?: string | null
          partner_agency_id?: string | null
          slug?: string
          start_date?: string | null
          status?: string
          terms_accepted_on?: string | null
          tier_band?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_partner_agency_id_fkey"
            columns: ["partner_agency_id"]
            isOneToOne: false
            referencedRelation: "partner_agencies"
            referencedColumns: ["id"]
          },
        ]
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
      family_moments: {
        Row: {
          added_by: string
          added_by_name: string | null
          caption: string | null
          child_id: string | null
          created_at: string
          family_id: string
          id: string
          kind: string
          milestone_label: string | null
          moment_date: string
          nanny_id: string | null
          storage_path: string | null
        }
        Insert: {
          added_by: string
          added_by_name?: string | null
          caption?: string | null
          child_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          kind?: string
          milestone_label?: string | null
          moment_date: string
          nanny_id?: string | null
          storage_path?: string | null
        }
        Update: {
          added_by?: string
          added_by_name?: string | null
          caption?: string | null
          child_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          milestone_label?: string | null
          moment_date?: string
          nanny_id?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_moments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "family_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_moments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_moments_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      family_nannies: {
        Row: {
          bio: string | null
          created_at: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          family_id: string
          id: string
          insurance_cover_from: string | null
          insurance_cover_until: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          invited_at: string | null
          name: string
          nanny_code: string | null
          nanny_code_hash: string | null
          photo_path: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          family_id: string
          id?: string
          insurance_cover_from?: string | null
          insurance_cover_until?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          invited_at?: string | null
          name: string
          nanny_code?: string | null
          nanny_code_hash?: string | null
          photo_path?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          family_id?: string
          id?: string
          insurance_cover_from?: string | null
          insurance_cover_until?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          invited_at?: string | null
          name?: string
          nanny_code?: string | null
          nanny_code_hash?: string | null
          photo_path?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_nannies_family_id_fkey"
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
      family_services: {
        Row: {
          created_at: string
          curation_notes: string | null
          curation_status: string
          family_id: string
          id: string
          payroll_notes: string | null
          payroll_start_date: string | null
          payroll_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curation_notes?: string | null
          curation_status?: string
          family_id: string
          id?: string
          payroll_notes?: string | null
          payroll_start_date?: string | null
          payroll_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curation_notes?: string | null
          curation_status?: string
          family_id?: string
          id?: string
          payroll_notes?: string | null
          payroll_start_date?: string | null
          payroll_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_services_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_checklists: {
        Row: {
          created_at: string
          dinner_status: string | null
          energy: string | null
          family_id: string
          handover_date: string
          homework_status: string | null
          id: string
          mood: string | null
          nanny_id: string | null
          parent_notes: string | null
          pe_kit_ready: boolean
          reading_done: boolean
          school_bag_ready: boolean
          submitted_by: string
          submitted_by_name: string | null
          tomorrow_notes: string | null
          updated_at: string
          water_status: string | null
        }
        Insert: {
          created_at?: string
          dinner_status?: string | null
          energy?: string | null
          family_id: string
          handover_date?: string
          homework_status?: string | null
          id?: string
          mood?: string | null
          nanny_id?: string | null
          parent_notes?: string | null
          pe_kit_ready?: boolean
          reading_done?: boolean
          school_bag_ready?: boolean
          submitted_by?: string
          submitted_by_name?: string | null
          tomorrow_notes?: string | null
          updated_at?: string
          water_status?: string | null
        }
        Update: {
          created_at?: string
          dinner_status?: string | null
          energy?: string | null
          family_id?: string
          handover_date?: string
          homework_status?: string | null
          id?: string
          mood?: string | null
          nanny_id?: string | null
          parent_notes?: string | null
          pe_kit_ready?: boolean
          reading_done?: boolean
          school_bag_ready?: boolean
          submitted_by?: string
          submitted_by_name?: string | null
          tomorrow_notes?: string | null
          updated_at?: string
          water_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handover_checklists_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_checklists_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      house_manual_entries: {
        Row: {
          category: string
          family_id: string
          has_secret: boolean | null
          id: string
          notes: string
          secret_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          family_id: string
          has_secret?: boolean | null
          id?: string
          notes?: string
          secret_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          family_id?: string
          has_secret?: boolean | null
          id?: string
          notes?: string
          secret_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_manual_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      household_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          sender_name: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          sender_name?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          sender_name?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "household_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      household_threads: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          family_unread: boolean
          id: string
          last_sender: string
          nanny_unread: boolean
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          family_unread?: boolean
          id?: string
          last_sender: string
          nanny_unread?: boolean
          title: string
          topic?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          family_unread?: boolean
          id?: string
          last_sender?: string
          nanny_unread?: boolean
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_threads_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      household_permissions: {
        Row: {
          answer: string
          category: string
          family_id: string
          id: string
          is_custom: boolean
          label: string
          note: string
          permission_key: string
          updated_at: string
          updated_by_name: string | null
        }
        Insert: {
          answer: string
          category?: string
          family_id: string
          id?: string
          is_custom?: boolean
          label: string
          note?: string
          permission_key: string
          updated_at?: string
          updated_by_name?: string | null
        }
        Update: {
          answer?: string
          category?: string
          family_id?: string
          id?: string
          is_custom?: boolean
          label?: string
          note?: string
          permission_key?: string
          updated_at?: string
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_permissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by_name: string | null
          action_taken: string
          child_name: string
          created_at: string
          family_id: string
          id: string
          kind: string
          occurred_at: string
          parents_told: boolean
          reported_by: string
          reported_by_name: string | null
          severity: string
          what_happened: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by_name?: string | null
          action_taken?: string
          child_name: string
          created_at?: string
          family_id: string
          id?: string
          kind?: string
          occurred_at?: string
          parents_told?: boolean
          reported_by?: string
          reported_by_name?: string | null
          severity?: string
          what_happened: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by_name?: string | null
          action_taken?: string
          child_name?: string
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          occurred_at?: string
          parents_told?: boolean
          reported_by?: string
          reported_by_name?: string | null
          severity?: string
          what_happened?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      kids_playbook_entries: {
        Row: {
          added_by: string
          category: string
          child_name: string
          family_id: string
          id: string
          notes: string
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string
          category: string
          child_name?: string
          family_id: string
          id?: string
          notes?: string
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          category?: string
          child_name?: string
          family_id?: string
          id?: string
          notes?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_playbook_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          days: number
          end_date: string
          family_id: string
          id: string
          leave_type: string
          nanny_id: string | null
          notes: string | null
          requested_by: string
          reviewed_at: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days?: number
          end_date: string
          family_id: string
          id?: string
          leave_type?: string
          nanny_id?: string | null
          notes?: string | null
          requested_by?: string
          reviewed_at?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          end_date?: string
          family_id?: string
          id?: string
          leave_type?: string
          nanny_id?: string | null
          notes?: string | null
          requested_by?: string
          reviewed_at?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_doses: {
        Row: {
          child_name: string
          created_at: string
          dose: string | null
          family_id: string
          given_at: string
          given_by: string
          given_by_name: string | null
          id: string
          medicine: string
          next_dose_from: string | null
          notes: string | null
          reason: string | null
        }
        Insert: {
          child_name: string
          created_at?: string
          dose?: string | null
          family_id: string
          given_at?: string
          given_by?: string
          given_by_name?: string | null
          id?: string
          medicine: string
          next_dose_from?: string | null
          notes?: string | null
          reason?: string | null
        }
        Update: {
          child_name?: string
          created_at?: string
          dose?: string | null
          family_id?: string
          given_at?: string
          given_by?: string
          given_by_name?: string | null
          id?: string
          medicine?: string
          next_dose_from?: string | null
          notes?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_doses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_agreements: {
        Row: {
          additional_terms: string | null
          agreement_data: Json
          created_at: string
          duties: string | null
          employer_names: string | null
          family_id: string
          holiday: string | null
          hourly_rate: string | null
          hours: string | null
          id: string
          issued_at: string | null
          nanny_id: string | null
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
          agreement_data?: Json
          created_at?: string
          duties?: string | null
          employer_names?: string | null
          family_id: string
          holiday?: string | null
          hourly_rate?: string | null
          hours?: string | null
          id?: string
          issued_at?: string | null
          nanny_id?: string | null
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
          agreement_data?: Json
          created_at?: string
          duties?: string | null
          employer_names?: string | null
          family_id?: string
          holiday?: string | null
          hourly_rate?: string | null
          hours?: string | null
          id?: string
          issued_at?: string | null
          nanny_id?: string | null
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
          {
            foreignKeyName: "nanny_agreements_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_bank_details: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string | null
          family_id: string
          iban: string | null
          id: string
          nanny_id: string
          payment_reference: string | null
          sort_code: string | null
          swift: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name?: string | null
          family_id: string
          iban?: string | null
          id?: string
          nanny_id: string
          payment_reference?: string | null
          sort_code?: string | null
          swift?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string | null
          family_id?: string
          iban?: string | null
          id?: string
          nanny_id?: string
          payment_reference?: string | null
          sort_code?: string | null
          swift?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nanny_bank_details_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nanny_bank_details_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      nanny_safety_documents: {
        Row: {
          document_type: string
          expires_on: string | null
          family_id: string
          file_name: string
          id: string
          issued_on: string | null
          nanny_id: string
          reference_label: string | null
          storage_path: string
          uploaded_at: string
          visibility: string
        }
        Insert: {
          document_type: string
          expires_on?: string | null
          family_id: string
          file_name: string
          id?: string
          issued_on?: string | null
          nanny_id: string
          reference_label?: string | null
          storage_path: string
          uploaded_at?: string
          visibility?: string
        }
        Update: {
          document_type?: string
          expires_on?: string | null
          family_id?: string
          file_name?: string
          id?: string
          issued_on?: string | null
          nanny_id?: string
          reference_label?: string | null
          storage_path?: string
          uploaded_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "nanny_safety_documents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nanny_safety_documents_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_agencies: {
        Row: {
          allow_challenges: boolean
          allow_perks: boolean
          allow_playbooks: boolean
          brand_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          intro_pricing: boolean
          logo_data: string | null
          name: string
          short_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allow_challenges?: boolean
          allow_perks?: boolean
          allow_playbooks?: boolean
          brand_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intro_pricing?: boolean
          logo_data?: string | null
          name: string
          short_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allow_challenges?: boolean
          allow_perks?: boolean
          allow_playbooks?: boolean
          brand_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intro_pricing?: boolean
          logo_data?: string | null
          name?: string
          short_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_agency_staff: {
        Row: {
          agency_id: string
          created_at: string
          email: string
          id: string
          user_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          email: string
          id?: string
          user_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_agency_staff_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "partner_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_perks: {
        Row: {
          agency_id: string | null
          area: string | null
          category: string
          contact_text: string | null
          created_at: string
          description: string | null
          expires_on: string | null
          id: string
          is_published: boolean
          offer_code: string | null
          offer_text: string
          partner_name: string
          redemption_instructions: string | null
          sort_order: number
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          agency_id?: string | null
          area?: string | null
          category?: string
          contact_text?: string | null
          created_at?: string
          description?: string | null
          expires_on?: string | null
          id?: string
          is_published?: boolean
          offer_code?: string | null
          offer_text: string
          partner_name: string
          redemption_instructions?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          agency_id?: string | null
          area?: string | null
          category?: string
          contact_text?: string | null
          created_at?: string
          description?: string | null
          expires_on?: string | null
          id?: string
          is_published?: boolean
          offer_code?: string | null
          offer_text?: string
          partner_name?: string
          redemption_instructions?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_perks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "partner_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_entries: {
        Row: {
          added_by: string
          added_by_name: string | null
          amount: number
          created_at: string
          description: string
          entry_date: string
          family_id: string
          id: string
          kind: string
        }
        Insert: {
          added_by: string
          added_by_name?: string | null
          amount: number
          created_at?: string
          description: string
          entry_date: string
          family_id: string
          id?: string
          kind: string
        }
        Update: {
          added_by?: string
          added_by_name?: string | null
          amount?: number
          created_at?: string
          description?: string
          entry_date?: string
          family_id?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_entries: {
        Row: {
          added_by: string
          child_name: string | null
          created_at: string
          end_time_label: string | null
          entry_date: string
          entry_type: string
          family_id: string
          id: string
          notes: string | null
          status: string
          time_label: string | null
          title: string
        }
        Insert: {
          added_by?: string
          child_name?: string | null
          created_at?: string
          end_time_label?: string | null
          entry_date: string
          entry_type?: string
          family_id: string
          id?: string
          notes?: string | null
          status?: string
          time_label?: string | null
          title: string
        }
        Update: {
          added_by?: string
          child_name?: string | null
          created_at?: string
          end_time_label?: string | null
          entry_date?: string
          entry_type?: string
          family_id?: string
          id?: string
          notes?: string | null
          status?: string
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
      playbook_reads: {
        Row: {
          family_id: string
          id: string
          playbook_id: string
          read_at: string
          reader_role: string
        }
        Insert: {
          family_id: string
          id?: string
          playbook_id: string
          read_at?: string
          reader_role: string
        }
        Update: {
          family_id?: string
          id?: string
          playbook_id?: string
          read_at?: string
          reader_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_reads_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_reads_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "seasonal_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_recipients: {
        Row: {
          created_at: string
          family_id: string
          id: string
          playbook_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          playbook_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          playbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_recipients_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_recipients_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "seasonal_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      review_checkins: {
        Row: {
          answers: Json
          author: string
          call_requested: boolean
          completed_at: string | null
          created_at: string
          family_id: string
          id: string
          kind: string
          nanny_id: string | null
          status: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          author?: string
          call_requested?: boolean
          completed_at?: string | null
          created_at?: string
          family_id: string
          id?: string
          kind?: string
          nanny_id?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          author?: string
          call_requested?: boolean
          completed_at?: string | null
          created_at?: string
          family_id?: string
          id?: string
          kind?: string
          nanny_id?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_checkins_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_checkins_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_checkins_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_resources: {
        Row: {
          created_at: string
          details: Json
          family_id: string
          id: string
          resource_type: string
          saved_by: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          details?: Json
          family_id: string
          id?: string
          resource_type: string
          saved_by?: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          details?: Json
          family_id?: string
          id?: string
          resource_type?: string
          saved_by?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_resources_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_playbooks: {
        Row: {
          age_guidance: string | null
          agency_id: string | null
          audience: string
          cover_image_url: string | null
          created_at: string
          id: string
          introduction: string | null
          is_featured: boolean
          is_published: boolean
          published_at: string | null
          resource_url: string | null
          season: string
          sections: Json
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          age_guidance?: string | null
          agency_id?: string | null
          audience?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          introduction?: string | null
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          resource_url?: string | null
          season: string
          sections?: Json
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          age_guidance?: string | null
          agency_id?: string | null
          audience?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          introduction?: string | null
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          resource_url?: string | null
          season?: string
          sections?: Json
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_playbooks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "partner_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      sports_passport_entries: {
        Row: {
          activity: string
          badge: string | null
          child_name: string
          confidence_level: number
          created_at: string
          effort_level: number
          entry_date: string
          family_id: string
          id: string
          logged_by: string
          logged_by_name: string | null
          minutes: number
          notes: string | null
          skill_area: string
        }
        Insert: {
          activity: string
          badge?: string | null
          child_name: string
          confidence_level?: number
          created_at?: string
          effort_level?: number
          entry_date?: string
          family_id: string
          id?: string
          logged_by?: string
          logged_by_name?: string | null
          minutes?: number
          notes?: string | null
          skill_area?: string
        }
        Update: {
          activity?: string
          badge?: string | null
          child_name?: string
          confidence_level?: number
          created_at?: string
          effort_level?: number
          entry_date?: string
          family_id?: string
          id?: string
          logged_by?: string
          logged_by_name?: string | null
          minutes?: number
          notes?: string | null
          skill_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "sports_passport_entries_family_id_fkey"
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
          nanny_unread: boolean
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
          nanny_unread?: boolean
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
          nanny_unread?: boolean
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
      timesheet_shifts: {
        Row: {
          break_minutes: number
          created_at: string
          end_time: string
          family_id: string
          hourly_rate: number
          id: string
          is_overnight: boolean
          notes: string | null
          reviewed_at: string | null
          shift_date: string
          shift_type: string
          start_time: string
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_time: string
          family_id: string
          hourly_rate?: number
          id?: string
          is_overnight?: boolean
          notes?: string | null
          reviewed_at?: string | null
          shift_date: string
          shift_type?: string
          start_time: string
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          family_id?: string
          hourly_rate?: number
          id?: string
          is_overnight?: boolean
          notes?: string | null
          reviewed_at?: string | null
          shift_date?: string
          shift_type?: string
          start_time?: string
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_shifts_family_id_fkey"
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
      travel_trips: {
        Row: {
          accommodation: string | null
          checklist: Json
          created_at: string
          destination: string
          end_date: string
          family_id: string
          handover_notes: Json
          id: string
          local_emergency: string | null
          nearest_hospital: string | null
          notes: string | null
          start_date: string
          time_difference: string | null
          travel_pay: string | null
          updated_at: string
        }
        Insert: {
          accommodation?: string | null
          checklist?: Json
          created_at?: string
          destination: string
          end_date: string
          family_id: string
          handover_notes?: Json
          id?: string
          local_emergency?: string | null
          nearest_hospital?: string | null
          notes?: string | null
          start_date: string
          time_difference?: string | null
          travel_pay?: string | null
          updated_at?: string
        }
        Update: {
          accommodation?: string | null
          checklist?: Json
          created_at?: string
          destination?: string
          end_date?: string
          family_id?: string
          handover_notes?: Json
          id?: string
          local_emergency?: string | null
          nearest_hospital?: string | null
          notes?: string | null
          start_date?: string
          time_difference?: string | null
          travel_pay?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_trips_family_id_fkey"
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
      welcome_checkins: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string
          family_id: string
          id: string
          nanny_id: string
          note: string
          step_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by: string
          family_id: string
          id?: string
          nanny_id: string
          note?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string
          family_id?: string
          id?: string
          nanny_id?: string
          note?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_checkins_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_checkins_nanny_id_fkey"
            columns: ["nanny_id"]
            isOneToOne: false
            referencedRelation: "family_nannies"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_progress: {
        Row: {
          created_at: string
          family_id: string
          finished_at: string | null
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          finished_at?: string | null
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          finished_at?: string | null
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_progress_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_partner_brand: {
        Args: { _handle: string }
        Returns: {
          agency_name: string
          handle: string
          wallet_name: string
        }[]
      }
      get_partner_logo: { Args: { _handle: string }; Returns: string }
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

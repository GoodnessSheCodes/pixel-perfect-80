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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          doctor_id: string
          expires_at: string | null
          id: string
          method: string
          patient_id: string
          requested_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["grant_status"]
        }
        Insert: {
          doctor_id: string
          expires_at?: string | null
          id?: string
          method?: string
          patient_id: string
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["grant_status"]
        }
        Update: {
          doctor_id?: string
          expires_at?: string | null
          id?: string
          method?: string
          patient_id?: string
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["grant_status"]
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_patient_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_patient_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_patient_id?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          consultation_date: string
          created_at: string
          diagnosis: string
          doctor_id: string
          findings: string | null
          follow_up_date: string | null
          follow_up_instructions: string | null
          id: string
          patient_id: string
          reason: string
          treatment_plan: string | null
        }
        Insert: {
          consultation_date?: string
          created_at?: string
          diagnosis: string
          doctor_id: string
          findings?: string | null
          follow_up_date?: string | null
          follow_up_instructions?: string | null
          id?: string
          patient_id: string
          reason: string
          treatment_plan?: string | null
        }
        Update: {
          consultation_date?: string
          created_at?: string
          diagnosis?: string
          doctor_id?: string
          findings?: string | null
          follow_up_date?: string | null
          follow_up_instructions?: string | null
          id?: string
          patient_id?: string
          reason?: string
          treatment_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["user_id"]
          },
        ]
      }
      doctor_profiles: {
        Row: {
          created_at: string
          hpcsa_number: string | null
          practice_name: string | null
          reviewed_at: string | null
          specialty: string | null
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          hpcsa_number?: string | null
          practice_name?: string | null
          reviewed_at?: string | null
          specialty?: string | null
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          hpcsa_number?: string | null
          practice_name?: string | null
          reviewed_at?: string | null
          specialty?: string | null
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[]
          blood_type: string | null
          conditions: string[]
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          patient_code: string
          sex: string | null
          share_code: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          blood_type?: string | null
          conditions?: string[]
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          patient_code: string
          sex?: string | null
          share_code?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          blood_type?: string | null
          conditions?: string[]
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          patient_code?: string
          sex?: string | null
          share_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dosage: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          medication_name: string
          prescription_id: string
        }
        Insert: {
          dosage: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          medication_name: string
          prescription_id: string
        }
        Update: {
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medication_name?: string
          prescription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          consultation_id: string | null
          doctor_id: string
          id: string
          issued_at: string
          notes: string | null
          patient_id: string
          prescription_number: string
          viewed_at: string | null
        }
        Insert: {
          consultation_id?: string | null
          doctor_id: string
          id?: string
          issued_at?: string
          notes?: string | null
          patient_id: string
          prescription_number?: string
          viewed_at?: string | null
        }
        Update: {
          consultation_id?: string | null
          doctor_id?: string
          id?: string
          issued_at?: string
          notes?: string | null
          patient_id?: string
          prescription_number?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_demo: boolean
          phone: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_demo?: boolean
          phone?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_demo?: boolean
          phone?: string | null
          username?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      create_consultation: {
        Args: {
          _date: string
          _diagnosis: string
          _findings: string
          _follow: string
          _follow_date: string
          _patient: string
          _plan: string
          _reason: string
        }
        Returns: string
      }
      gen_patient_code: { Args: never; Returns: string }
      has_access: {
        Args: { _doctor: string; _patient: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_verified_doctor: { Args: { _uid: string }; Returns: boolean }
      issue_prescription: {
        Args: {
          _consultation: string
          _items: Json
          _notes: string
          _patient: string
        }
        Returns: string
      }
      log_event: {
        Args: { _action: string; _details?: Json; _target: string }
        Returns: undefined
      }
      log_record_view: { Args: { _patient: string }; Returns: undefined }
      mark_prescription_viewed: { Args: { _rx: string }; Returns: undefined }
      request_access: {
        Args: { _dob: string; _patient: string; _share_code?: string }
        Returns: string
      }
      respond_access: {
        Args: { _approve: boolean; _grant: string }
        Returns: undefined
      }
      search_patient: {
        Args: { _q: string }
        Returns: {
          birth_year: number
          display_name: string
          patient_code: string
          patient_id: string
        }[]
      }
      set_doctor_verification: {
        Args: {
          _doctor: string
          _status: Database["public"]["Enums"]["verification_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "admin"
      grant_status: "pending" | "approved" | "denied" | "revoked"
      verification_status: "pending" | "verified" | "rejected"
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
      app_role: ["patient", "doctor", "admin"],
      grant_status: ["pending", "approved", "denied", "revoked"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const

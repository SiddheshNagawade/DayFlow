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
      behavior_logs: {
        Row: {
          actual_duration: number | null
          ai_intervention: string | null
          client_occurred_at: string
          day_of_week: number | null
          device_id: string | null
          energy_level: string | null
          event_type: string
          feedback: string | null
          focus_score: number | null
          hour_of_day: number | null
          id: string
          interruption_count: number | null
          intervention_accepted: boolean | null
          planned_duration: number | null
          project_id: string | null
          received_at: string
          scheduler_version: string | null
          task_category: string | null
          task_id: string | null
          task_priority: string | null
          task_snapshot: Json
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          ai_intervention?: string | null
          client_occurred_at?: string
          day_of_week?: number | null
          device_id?: string | null
          energy_level?: string | null
          event_type: string
          feedback?: string | null
          focus_score?: number | null
          hour_of_day?: number | null
          id?: string
          interruption_count?: number | null
          intervention_accepted?: boolean | null
          planned_duration?: number | null
          project_id?: string | null
          received_at?: string
          scheduler_version?: string | null
          task_category?: string | null
          task_id?: string | null
          task_priority?: string | null
          task_snapshot?: Json
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          ai_intervention?: string | null
          client_occurred_at?: string
          day_of_week?: number | null
          device_id?: string | null
          energy_level?: string | null
          event_type?: string
          feedback?: string | null
          focus_score?: number | null
          hour_of_day?: number | null
          id?: string
          interruption_count?: number | null
          intervention_accepted?: boolean | null
          planned_duration?: number | null
          project_id?: string | null
          received_at?: string
          scheduler_version?: string | null
          task_category?: string | null
          task_id?: string | null
          task_priority?: string | null
          task_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          capacity_impact: string
          capacity_reduction_pct: number | null
          data: Json
          deleted_at: string | null
          end_date: string
          id: string
          schema_version: number
          start_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity_impact?: string
          capacity_reduction_pct?: number | null
          data: Json
          deleted_at?: string | null
          end_date: string
          id: string
          schema_version?: number
          start_date: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity_impact?: string
          capacity_reduction_pct?: number | null
          data?: Json
          deleted_at?: string | null
          end_date?: string
          id?: string
          schema_version?: number
          start_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: Json
          created_at: string
          fixed_blocks: Json
          goals: Json
          id: string
          knowledge_layer: Json
          life_visions: Json
          onboarding_complete: boolean
          onboarding_profile: Json
          preferences: Json
          profile_emoji: string
          profile_name: string | null
          reflections: Json
          routines: Json
          schema_version: number
          settings: Json
          updated_at: string
          weight_log: Json
        }
        Insert: {
          achievements?: Json
          created_at?: string
          fixed_blocks?: Json
          goals?: Json
          id: string
          knowledge_layer?: Json
          life_visions?: Json
          onboarding_complete?: boolean
          onboarding_profile?: Json
          preferences?: Json
          profile_emoji?: string
          profile_name?: string | null
          reflections?: Json
          routines?: Json
          schema_version?: number
          settings?: Json
          updated_at?: string
          weight_log?: Json
        }
        Update: {
          achievements?: Json
          created_at?: string
          fixed_blocks?: Json
          goals?: Json
          id?: string
          knowledge_layer?: Json
          life_visions?: Json
          onboarding_complete?: boolean
          onboarding_profile?: Json
          preferences?: Json
          profile_emoji?: string
          profile_name?: string | null
          reflections?: Json
          routines?: Json
          schema_version?: number
          settings?: Json
          updated_at?: string
          weight_log?: Json
        }
        Relationships: []
      }
      projects: {
        Row: {
          data: Json
          deleted_at: string | null
          field_timestamps: Json
          goal_id: string | null
          id: string
          schema_version: number
          status: string
          target_completion_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          deleted_at?: string | null
          field_timestamps?: Json
          goal_id?: string | null
          id: string
          schema_version?: number
          status?: string
          target_completion_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          deleted_at?: string | null
          field_timestamps?: Json
          goal_id?: string | null
          id?: string
          schema_version?: number
          status?: string
          target_completion_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          blocked_by: string[]
          blocks: string[]
          completed_at: string | null
          data: Json
          deadline: string | null
          deleted_at: string | null
          estimated_duration: number
          field_timestamps: Json
          id: string
          priority: string
          project_id: string | null
          scheduled_date: string | null
          schema_version: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_by?: string[]
          blocks?: string[]
          completed_at?: string | null
          data: Json
          deadline?: string | null
          deleted_at?: string | null
          estimated_duration?: number
          field_timestamps?: Json
          id: string
          priority?: string
          project_id?: string | null
          scheduled_date?: string | null
          schema_version?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_by?: string[]
          blocks?: string[]
          completed_at?: string | null
          data?: Json
          deadline?: string | null
          deleted_at?: string | null
          estimated_duration?: number
          field_timestamps?: Json
          id?: string
          priority?: string
          project_id?: string | null
          scheduled_date?: string | null
          schema_version?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

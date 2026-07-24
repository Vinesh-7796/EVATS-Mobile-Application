import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  )
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_uid: string
          role: string
          employee_id: string | null
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          auth_uid: string
          role?: string
          employee_id?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          auth_uid?: string
          role?: string
          employee_id?: string | null
          display_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      module_progress: {
        Row: {
          id: string
          user_id: string
          module_id: string
          status: string
          unlocked_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          status: string
          unlocked_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          status?: string
          unlocked_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          module_id: string
          score: number
          total_points: number
          percentage: number
          grade: string
          correct_answers: number
          total_questions: number
          taken_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          score: number
          total_points: number
          percentage: number
          grade: string
          correct_answers: number
          total_questions: number
          taken_at?: string
        }
        Update: never
        Relationships: []
      }
      game_attempts: {
        Row: {
          id: string
          user_id: string
          module_id: string
          game_type: string
          score: number
          percentage: number
          grade: string
          taken_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module_id: string
          game_type: string
          score: number
          percentage: number
          grade: string
          taken_at?: string
        }
        Update: never
        Relationships: []
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_active_date: string
          updated_at: string
        }
        Insert: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_active_date: string
          updated_at?: string
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          last_active_date?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_module_percentile: {
        Args: {
          p_module_id: string
          p_percentage: number
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

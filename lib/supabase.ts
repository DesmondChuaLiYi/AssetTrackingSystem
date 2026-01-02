import { createClient } from '@supabase/supabase-js'

// Supabase anon keys located in .env.local for security purposes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! // Link to Supabase project
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Anon key for authentication

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for Supabase tables
export type Database = {
  public: {
    Tables: {
      Users: {
        Row: {
          id: string
          microsoft_user_id: string
          role: string
          created_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          microsoft_user_id: string
          role?: string
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          microsoft_user_id?: string
          role?: string
          created_at?: string
          last_login?: string | null
        }
      }

      Location: {
        Row: {
          location_id: string
          name: string | null
          description: string | null
          block: string | null
          level: number | null
          created_dt: string
          updated_dt: string
        }
        Insert: {
          location_id: string
          name?: string | null
          description?: string | null
          block?: string | null
          level?: number | null
          created_dt?: string
          updated_dt?: string
        }
        Update: {
          location_id?: string
          name?: string | null
          description?: string | null
          block?: string | null
          level?: number | null
          created_dt?: string
          updated_dt?: string
        }
      }

      Department: {
        Row: {
          department_id: string
          name: string | null
          block: string | null
          level: number | null
          created_dt: string
          updated_dt: string
        }
        Insert: {
          department_id: string
          name?: string | null
          block?: string | null
          level?: number | null
          created_dt?: string
          updated_dt?: string
        }
        Update: {
          department_id?: string
          name?: string | null
          block?: string | null
          level?: number | null
          created_dt?: string
          updated_dt?: string
        }
      }

      Asset: {
        Row: {
          asset_id: string
          name: string | null
          model: string | null
          description: string | null
          condition: string | null
          location_id: string | null
          department_id: string | null
          category: string | null
          created_dt: string
          updated_dt: string
        }
        Insert: {
          asset_id: string
          name?: string | null
          model?: string | null
          description?: string | null
          condition?: string | null
          location_id?: string | null
          department_id?: string | null
          category?: string | null
          created_dt?: string
          updated_dt?: string
        }
        Update: {
          asset_id?: string
          name?: string | null
          model?: string | null
          description?: string | null
          condition?: string | null
          location_id?: string | null
          department_id?: string | null
          category?: string | null
          created_dt?: string
          updated_dt?: string
        }
      }

      Staff: {
        Row: {
          staff_id: string
          name: string | null
          email: string | null
          mobile_no: string | null
          department_id: string | null
          created_dt: string
          updated_dt: string
        }
        Insert: {
          staff_id: string
          name?: string | null
          email?: string | null
          mobile_no?: string | null
          department_id?: string | null
          created_dt?: string
          updated_dt?: string
        }
        Update: {
          staff_id?: string
          name?: string | null
          email?: string | null
          mobile_no?: string | null
          department_id?: string | null
          created_dt?: string
          updated_dt?: string
        }
      }

      StaffAsset: {
        Row: {
          id: string
          staff_id: string | null
          asset_id: string | null
          created_dt: string
        }
        Insert: {
          id: string
          staff_id?: string | null
          asset_id?: string | null
          created_dt?: string
        }
        Update: {
          id?: string
          staff_id?: string | null
          asset_id?: string | null
          created_dt?: string
        }
      }

      LocationHistory: {
        Row: {
          id: string
          location_id: string | null
          asset_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          location_id?: string | null
          asset_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          location_id?: string | null
          asset_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
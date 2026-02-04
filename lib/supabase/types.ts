// lib/supabase/types.ts
/* Commented by Desmond @ 12-Jan-2026
    - Split the supabase.ts file into three separate files: client.ts, server.ts and types.ts
    - This file contains type definitions for the database tables in Supabase
    - Each table has Row, Insert, and Update types to define the shape of data
      when reading, inserting, or updating records
*/

// This matches PostgreSQL / JSONB columns
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// Database interface: It represents the entire Supabase database schema
// It is expected by "createClient<Database>" in client.ts and server.ts
export interface Database {
    public: {
        Tables: { // Follow the patter of Row, Insert and Update
            Users: { // Table name according to Supabase
                Row: { // Represents what comes out of the database, select()
                    id: string
                    microsoft_user_id: string
                    role: string
                    created_at: string
                    last_login: string | null
                }
                Insert: { // What you are allowed to PUT in, used by .insert()
                    id?: string
                    microsoft_user_id: string
                    role?: string
                    created_at?: string
                    last_login?: string | null
                }
                Update: { // What you can change, used by .update()
                    id?: string
                    microsoft_user_id?: string
                    role?: string
                    created_at?: string
                    last_login?: string | null
                }
                // Placeholder for foregin key metadata
                Relationships: []
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
                Relationships: []
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
                Relationships: []
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
                Relationships: []
            }

            Staff: {
                Row: {
                    staff_id: string
                    name: string | null
                    email: string | null
                    mobile_no: string | null
                    department_id: string | null
                    microsoft_user_id: string | null
                    created_dt: string
                    updated_dt: string
                    status: string
                    role: string | null
                }
                Insert: {
                    staff_id: string
                    name?: string | null
                    email?: string | null
                    mobile_no?: string | null
                    department_id?: string | null
                    microsoft_user_id?: string | null
                    created_dt?: string
                    updated_dt?: string
                    status?: string
                    role?: string | null
                }
                Update: {
                    staff_id?: string
                    name?: string | null
                    email?: string | null
                    mobile_no?: string | null
                    department_id?: string | null
                    microsoft_user_id?: string | null
                    created_dt?: string
                    updated_dt?: string
                    status?: string
                    role?: string | null
                }
                Relationships: []
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
                Relationships: []
            }

            Sessions: {
                Row: {
                    id: string
                    staff_id: string
                    microsoft_id: string | null
                    status: string
                    login_location: string | null
                    created_dt: string
                }
                Insert: {
                    id?: string
                    staff_id: string
                    microsoft_id?: string | null
                    status?: string
                    login_location?: string | null
                    created_dt?: string
                }
                Update: {
                    id?: string
                    staff_id?: string
                    microsoft_id?: string | null
                    status?: string
                    login_location?: string | null
                    created_dt?: string
                }
                Relationships: []
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
                Relationships: []
            }
        }

        /* 
            Commented by Desmond @ 21-Jan-2026: Start
            - The following functions were added to resolve an issue in the API routes
            - where Supabase functions returned "never" type
            - Therefore, this is a workaround to fix the issue
        */
        Views: {
            // Meaning empty, and we are not using these features yet
            [_ in never]: never
        }

        Functions: {
            // RPC functions to be used in the application
            get_next_staff_id: {
                Args: Record<string, never> // No arguments
                Returns: string // Returns the next staff ID
            }
        }

        Enums: {
            // Meaning empty, and we are not using these features yet
            [_ in never]: never
        }

        CompositeTypes: {
            // Meaning empty, and we are not using these features yet
            [_ in never]: never
        }

        // Commented by Desmond @ 21-Jan-2026: End
    }
}
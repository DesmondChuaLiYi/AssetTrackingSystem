// lib/supabase/client.ts
/* Commented by Desmond @ 12-Jan-2026
    - Split the supabase.ts file into three separate files: client.ts, server.ts and types.ts
    - This file is client safe because it uses anon key and public URL
    - No sensitive operations should be done here
*/
import { createClient } from "@supabase/supabase-js" // Creates a Supabase client to interact with the database
import type { Database } from "./types" // Import type definitions for Supabase tables

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! // Link to Supabase project
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Anon key for authentication

if (!supabaseUrl) { // If Supabase URL environment URL does not exist
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) { // If Supabase Anon key does not exist
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Create a single Supabase client with DB type definitions
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
// lib/supabase/server.ts
/* Commented by Desmond @ 12-Jan-2026
- Split the supabase.ts file into three separate files: client.ts, server.ts and types.ts
    - This file is safe for server use only
    - Never import this file into client components
    - Never expose the service role key
    - Only put in API routes or server-side code
*/
import { createClient } from "@supabase/supabase-js" // Creates a Supabase client to interact with the database
import type { Database } from "./types" // Import type definitions for Supabase tables

// The environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) { // If the Supabase URL environment URL is not found
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseServiceKey) { // If the Supabase service role key is not found
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
}

export const supabaseAdmin = createClient<Database>(
    supabaseUrl, supabaseServiceKey
)
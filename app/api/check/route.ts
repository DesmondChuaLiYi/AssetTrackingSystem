/** Commented by Desmond @ 30-April-26
 * @file app/api/check/route.ts
 * @description Unified duplicate ID check endpoint for Asset, Location and Department
 *
 * Replaces:
 *  - app/api/assets/check/route.ts (previously only checked assets)
 *  - app/api/idcheck/route.ts (checked location + department)
 * 
 * Rationale for unification:
 *  All three entities perform identical logic - querying a table by primary key and
 *  return { exists: boolean }. A single endpoint reduces duplication, and keeps the
 *  duplicate check in one place and easier to test.
 *
 * SECURITY: 
 *  - Checks include soft-deleted records (deleted_dt IS NOT NULL) because
 *    IDs that were previously used and then soft-deleted must never be reused —
 *    this preserves the FK integrity of historical records.
 *  - The `table` and `id` params are validated against a strict allowlist and that
 *    no raw table names from the user input ever reaches the query
 *
 * @example
 *  GET /api/check?table=Asset&id=ICT-LAPTOP-001
 *  GET /api/check?table=Location&id=G001
 *  GET /api/check?table=Department&id=IT
 * 
 *  Response : { exists: true } | { exists: false }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateSession } from '@/lib/apiAuth'
import { z } from 'zod'

// --------------------------------------------------------------
//                          Schema
// --------------------------------------------------------------
/** 
 * White-listed table names. Only three tables support duplicate checking.
 * Using the z.enum prevents any other table name from being passed to this
 * DB query.
 */
const ALLOWED_TABLES = ['Asset', 'Location', 'Department'] as const
type allowedTable = typeof ALLOWED_TABLES[number]

// Map each table to its primary key column name
// Kept as const so that it is not derived from the user input
const PRIMARY_KEY_MAP: Record<allowedTable, string> = {
  Asset: 'asset_id',
  Location: 'location_id',
  Department: 'department_id'
}

// --------------------------------------------------------------
//                          Zod schema
// --------------------------------------------------------------
/**
 * Zod schema for the query string parameters.
 * The `id` regex should match the same safe-ID pattern enforced by the POST schemas:
 *  letters, numbers, hyphens, underscores only - No URLS, spaces, or special characters
 */
const querySchema = z.object({
  table: z.enum(ALLOWED_TABLES, { 
    message: 'Table must be Asset, Location or Department'
  }),

  id: z.string()
       .min(1, 'ID is required')
       .max(30, 'ID must be 30 characters or less')
       .regex(/^[A-Za-z0-9\-_]+$/,
          'ID may only contain letters, numbers, hyphens and underscores'
       )
})

// --------------------------------------------------------------
//                          Handlers
// --------------------------------------------------------------
/**
 * GET /api/check?table=Asset&id=ICT-LAPTOP-001
 * 
 * Returns { exists: true } if the ID is taken (active OR soft deleted)
 * Returns { exists: false } if the ID is available
 * Returns 401/403 if the session is invalid
 * 
 * @param request - Incoming HTTP GET request with query params
 */
export async function GET (request: NextRequest) {
  // Ensure only valid and approved user/admin can use this API to perform duplicate checking
  const authResult = await validateSession()

  // If session is invalid, or unauthorized
  if (!authResult.authorized) {
    // Provide response and exit early
    return authResult.response
  }

  const { searchParams } = new URL(request.url)

  const parseResult = querySchema.safeParse({
    table: searchParams.get('table'),
    id: (searchParams.get('id') ?? '').trim().slice(0, 30)
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { table, id } = parseResult.data
  const pkColumn = PRIMARY_KEY_MAP[table]

  try {
    /**
     * We intentionally place no .is('deleted_dt', null) filter here because we want to check
     * whether both active and soft deleted records are using this ID. This is because previously used
     * IDs must never be reused to maintain audit trails, but also because reusing it would corrupt
     * the FK references in tables such as AuditLog
     */
    // Establish a connection with the database
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(pkColumn)
      .eq(pkColumn, id)
      .maybeSingle()

      if (error) {
        // Log the error to console for developers
        console.error(`[/api/check] Supabase error on ${table}:`, error.message)
        // Return NextResponse
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }

      // Return success response when not met with errors
      return NextResponse.json(
        { exists: data !== null }
      )
  // Catch the error
  } catch (err: unknown) {
    // Log the error to console for developers
    console.error('[/api/check] Unexpected error:', err instanceof Error ? err.message : err)
    // Return a NextResponse
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
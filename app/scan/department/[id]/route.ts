// app/scan/department/[id]/route.ts

/** Commented by Desmond @ 30-April-26
 * @file app/scan/department/[id]/route.ts
 * @description Public redirect handler for department QR code scans.
 * 
 * QR stickers encode: https://swinburne-assets.vercel.app/scan/department/IT
 * This route validates the department_id, then redirects to the scanner page.
 * 
 * See app/scan/location/[id]/route.ts for full design rationale.
 * The pattern is identical, only the table name and query param differ.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /scan/department/[id]

 * @param request - Incoming HTTP request
 * @param params - Route params containing `id` (the department_id from the URL)
 */
// Comments incomplete from here onwards...
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Sanitise: trim whitespace and cap at 30 chars (matches DB VARCHAR(30))
  const departmentId = id.trim().slice(0, 30)

  // Reject obviously invalid IDs
  if (!departmentId || /[<>'"%;/\\]/.test(departmentId)) {
    return NextResponse.redirect(new URL('/notFound', request.url))
  }

  try {
    // Verify the department exists and is not soft-deleted
    const { data, error } = await supabaseAdmin
      .from('Department')
      .select('department_id, name')
      .eq('department_id', departmentId)
      .is('deleted_dt', null) // Exclude soft-deleted records
      .single()

    if (error || !data) {
      return NextResponse.redirect(new URL('/notFound', request.url))
    }

    /**
     * Redirect to the user scanner page pre-loaded with this department context.
     * TO CHANGE THE DESTINATION: only edit this one line.
     */
    const destination = new URL('/user/scanner', request.url)
    destination.searchParams.set('type', 'department')
    destination.searchParams.set('scanDepartment', departmentId)

    return NextResponse.redirect(destination)
  } catch (err) {
    console.error('[scan/department] Unexpected error:', err)
    return NextResponse.redirect(new URL('/notFound', request.url))
  }
}

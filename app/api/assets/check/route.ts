/** 
 * Commented by Desmond @ 25-Mar-26
 * @file app/api/assets/check/route.ts
 * @description This file helps to check duplicate records in the Add asset form
 * Returns { exists: true } if an asset with the given ID already exists
 * (including soft-deleted ones - whereby we never allow ID reuse)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateSession } from '@/lib/apiAuth'

// ---------------- GET ----------------------
export async function GET(request: NextRequest) {
    // Checks if user has a valid session before proceeding
    const authResult = await validateSession()

    // When session validation fails, return a response
    if (!authResult.authorized) {
        return authResult.response
    }

    // Gets the URL, including the part after the ?, which has the asset_id
    const { searchParams } = new URL(request.url)

    // Sanitize the input to make sure asset_id is max 30 chars according to Zod and DB schema
    const asset_id = (searchParams.get('asset_id') || '').trim().slice(0, 30)

    // If asset_id is missing
    if (!asset_id) {
        return NextResponse.json(
            { error: 'asset_id query parameter is required' },
            { status: 400 }
        )
    }

    try {
        // maybeSingle() - returns null if no row is found
        // Additionally, do not filter by 'deleted_dt' because reusing it would ruin historical records
        const { data, error } = await supabaseAdmin
            .from('Asset') // 'Asset' table
            .select('asset_id') // Only select this column
            .eq('asset_id', asset_id) // Where the id matches what the user typed
            .maybeSingle() // Expect 0 or 1 result

        // Tell the user something is wrong with the server
        if (error) {
            console.error('[check] Supabase error:', error.message)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }

        // If data has a value, return { exists: true }.
        // Otherwise if data is null, then { exists: false }.
        return NextResponse.json(
            { exists: data !== null }
        )
    } catch (error) { // Catch any unexpected errors
        console.error('[check] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
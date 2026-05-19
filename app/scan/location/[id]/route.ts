//app/scan/location/[id]/route.ts

/** Commented by Desmond @ 29-April-26
 * @file app/scan/location/[id]/route.ts
 * @description Public redirect handler for location QR code scans.
 * 
 * QR code encode: https://swinburne-assets.vercel.app/scan/location/G001
 * This route validates the location_id, then redirects to the correct page.
 * 
 * DESIGN PRINCIPLE (Static QR + Dynamic Redirect):
 *  - The QR sticker URL (/scan/location/G001) remains static, permanent and never changes.
 *  - If the admin UI route changes (e.g. /admin/location/rooms becoming /admin/rooms),
 *    only the redirect destination below changes - stickers are never reprinted
 *  - This route is PUBLIC (no auth required) so any phone camera can scan it.
 *    Auth is enforced on the destination page so user has to sign in before presented
 *    with the page.
 * 
 * Middleware note: /scan/* is added to PUBLIC_PATHS in proxy.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /scan/location/[id]
 * 
 * Validates that the location exists (and is not soft-deleted), then redirects
 * to the scanner page pre-loaded with this location as the parent context.
 * 
 * Unauthenticated users are sent to /login, which will redirect back after login
 * using the standard Next.js callbackUrl mechanism.
 * 
 * @param request - Incoming HTTP request (used to build redirect URLs)
 * @param params - Route params containing `id` (the location_id from the URL)
 */
// { params } - contains the dynamic route parameters like "G001"
export async function GET (request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Sanitize, trim the whitespace and cap the limit at 30 chars (matches the DB VARCHAR(30))
    const locationId = id.trim().slice(0, 30)

    // Reject invalid IDs before hitting the database
    if (!locationId || /[<>'"%;/\\]/.test(locationId)) {
        return NextResponse.redirect(new URL('/not-found', request.url))
    }

    try {
        // Verify that the location exists and is not soft-deleted
        const { data, error } = await supabaseAdmin
            .from('Location')
            .select('location_id, name')
            .eq('location_id', locationId)
            .is('deleted_dt', null) // Exclude the soft-deleted records
            .single()

        // Handles invalid data such as DB errors or missing records
        if (error || !data) {
            // Location not found or deleted - redirect to the not found page
            return NextResponse.redirect(new URL('/notFound', request.url))
        }

        /**
         * Redirect to the user scanner page pre-loaded with this location context.
         * the scanner page reads this `scanLocation` query param and pre-fills the
         * "parent scan" state so users can immediately scan asset barcode.
         * 
         * TO CHANGE THE PAGE DESTINATION: only edit this one line.
         * The QR sticker itself never needs to be reprinted.
         */
        const destination = new URL('/user/scanner', request.url)
        // Create the absolute URL like https://swinburne-assets.vercel.app/user/scanner

        // Attach the query parameters
        destination.searchParams.set('type', 'location')
        destination.searchParams.set('scanLocation', locationId)
        // Resulting URL: /user/scanner?type=location&scanLocation=G001

        // Redirect the user to the destination page
        return NextResponse.redirect(destination)
    // Catch errors
    } catch (err) {
        // Log the error to console for developers
        console.error('[scan/location] Unexpected error:', err)
        // Redirect the user to the not found page
        return NextResponse.redirect(new URL('/notFound', request.url))
    }
}
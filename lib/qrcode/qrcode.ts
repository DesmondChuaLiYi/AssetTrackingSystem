// lib/qrcode/qrcode.ts
/** Commented by Desmond @ 27-April-26
 * @file qrcode.ts
 * @description This file is a server-only utility for generating QR codes for location and department
 * records.
 * 
 * LATEST CHANGES
 * --------------
 *  - Delegates the PNG generation to lib/idCode/idCodeImage.ts (buildQrBuffer)
 *    so the stored PNG is identical to the client-side qrPreview.
 *  - Accepts optional 'name' parameter embedded into the composite PNG.
 *  - BASE_URL correctly uses NEXT_PUBLIC_APP_URL (not NEXTAUTH_URL which is localhost:3000 in dev
 *    , which was causing bucket-stored QRs to encode localhost URLs instead of https://swinnburne-assets
 *    .vercel.app).
 * 
 * 
 * Old comments
 * ------------
 * Design factor: Using static QR (it is inconvenient to reprint a QR code many times) + dynamic 
 * redirect pattern (industry standard, meaning only the application logic changes but the QR code 
 * never changes).
 * A QR code will encode a permanent /scan/ URL. The redirect handler (app/scan...) decides where to 
 * redirect the user. If the destination URL changes, only the redirect logic will change and the printed
 * QR stickers are never reprinted.
 * 
 * QR code URL format:
 *   Location: https://swinburne-assets.vercel.app/scan/location/G001
 *   Department: https://swinburne-assets.vercel.app/scan/department/IT
 * 
 * Storage bucket: 'IdCodes'
 *   locations/G001.png
 *   departments/IT.png
 * 
 * 
 * IMPORTANT NOTES
 * ---------------
 * DO NOT import this file in client components - it uses the service role key via supabaseAdmin
 * 
 * Need to npm install before using this component
 *   npm install qrcode @types/qrcode
 */

// import QRCode from 'qrcode'
import { supabaseAdmin } from '../supabase/server'
import { buildQrBuffer, buildScanUrl } from '../idCode/idCodeImage'
import type { qrFolder } from '../idCode/idCodeImage'


// -------------------------------------------------------------
//                          Types
// -------------------------------------------------------------
// The only folders allowed inside the IdCodes bucket for QR codes
// export type qrFolder = 'locations' | 'departments'
export type { qrFolder }

// -------------------------------------------------------------
//                       Constants
// -------------------------------------------------------------
// Supabase storage name - same bucket used by barcode.ts
const BUCKET = 'IdCodes'
const MAX_QR_ID_LENGTH = 30

// Base URL for hte static scan redirect. Falls back to localhost in development.
// const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/&/, '') ??
//     'https://swinburne-assets.vercel.app'

// // Maximum allowed length for location_id or department_id
// const MAX_ID_LENGTH = 30

// Returned after a QR code is generated and uploaded to bucket
export interface uploadQrResult {
    // Relative storage path, e.g. "locations/G001.png" - stored in the DB column 'tag_path'
    tagPath: string

    // Full string URL from the Supabase SDK - to display barcode in the UI
    publicUrl: string

    // The static scan URL encoded inside the QR and never changed after printing
    scanUrl: string
}

// -------------------------------------------------------------
//                        Validation
// -------------------------------------------------------------
// Ensure that an ID string is safe to use as a primary key and QR payload
// Throw if the ID is invalid
/** @param id - The location_id or department_id to validate */
// unknown - the value can be a string or null
// asserts id is string - if function finish running without error, the id is string
// function validateId(id: unknown): asserts id is string {
//     // If the ID is not a string OR an empty string
//     // trim() removes whitespaces from both ends
//     // If the string is empty, trim() = false, !(false) = true
//     if (typeof id !== 'string' || !id.trim()) {
//         throw new Error('ID must be a non-empty string')
//     }

//     // If the ID length is over the pre-established threshold
//     if (id.length > MAX_ID_LENGTH) {
//         throw new Error(`ID exceeds maximum length (${MAX_ID_LENGTH} characters)`)
//     }

//     // Prevent directory traversal or URL injection
//     // Acts as a deny-list to check if a string contains special characters
//     // / and \\ (slashes) - Prevents directory traversal
//     // ? and # (URL meta-characters) - Prevents URL injection as it can change how a URL is parsed
//     // & and = (Inject extra arguments to db query) - Prevents parameter pollution
//     // < and > (Angle brackets) - Prevents cross-site scripting (XSS) and inject HTML tags or <script> tags
//     // ' and " (Quotes) - Prevents SQL injection and ensure ID cannot break out of its string container
//     // % and ; (Double encoding and query chaining) - Semicolon is often used in SQL to start a second malicious command
//     if (/[/\\?#&=<>'"%;]/.test(id)) { // .test(id) - true if id contains any of the listed characters
//         throw new Error('ID contains invalid characters')
//     }
// }

// -------------------------------------------------------------
//                        Public API
// -------------------------------------------------------------
/**
 * Generate a QR code png for the given ID, then upload it to Supabase bucket
 * and return the storage path and the public URL.
 * 
 * The QR code encodes the static scan redirect URL and not the final destination.
 * 
 * @param id - The location_id or department_id (e.g. "G001", "IT")
 * @param folder - 'locations' or 'departments'
 * @param name - Location or department name embedded onto this image
 * @returns - tagPath, publicUrl and the scanUrl encoded in the QR
 * 
 * @example
 *   const result = await generateAndUploadQr('G001', 'locations')
 *   // result.tagPath - "locations/G001.png"
 *   // result.scanUrl - "https://swinburne-assets.vercel.app/scan/location/G001"
 *   // result.publicUrl - "https://…supabase.co/storage/…/locations/G001.png"
 */
// Promise<uploadQrResult> - specifies what the function will return
export async function generateAndUploadQr(id: string, folder: qrFolder, name?: string): Promise<uploadQrResult> {
    if (!id?.trim()) {
        throw new Error('QR generation: ID must be non-empty')
    }

    if (id.length > MAX_QR_ID_LENGTH) {
        throw new Error(`QR generation: ID exceeds ${MAX_QR_ID_LENGTH} character limit`)
    }

    if (/[/\\?#&=<>'"%;]/.test(id)) {
        throw new Error('QR generation: ID contains invalid characters')
    }

    // Build the static scan URL that is permanently encoded to the QR sticker
    const scanUrl = buildScanUrl(folder, id)

    // Generate the QR code as a PNG buffer using the 'qrcode' npm package
    const pngBuffer = await buildQrBuffer({ id, folder, name })

    const tagPath = `${folder}/${id}.png`

    // Upload to Supabase bucket (upsert: true allows regeneration)
    // Start the connection to Supabase
    const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        // Upload the tagPath and the QR code image to bucket
        .upload(tagPath, pngBuffer, {
            contentType: 'image/png',
            upsert:true
        })

    if (uploadError) {
        throw new Error(`QR upload failed for ${id}: ${uploadError.message}`)
    }

    // Use the SDK to derive the public URL - never hardcode the bucket URLs
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(tagPath)
    
    return {
        tagPath,
        publicUrl: data.publicUrl,
        scanUrl
    }
}

/**
 * Deletes a QR code PNG from Supabase storage.
 * Used during cleanup if a DB insert fails after the QR was already uploaded.
 * 
 * @param tagPath - Relative storage path, e.g. "locations/G001.png"
 */
export async function deleteQr(tagPath: string): Promise<void> {
    // Only run if tagPath does not exist or if it's not a string
    if (!tagPath || typeof tagPath !== 'string') {
        return
    }

    // Establish Supabase connection with bucket
    const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([tagPath])

    if (error) {
        // Log the error but do not throw - the cleanup failure should not crash the caller (again)
        console.error(`[qrcode] Failed to delete QR file "${tagPath}":`, error.message)
    }
}

// Function to return the public URL for QR code images
export function getQrPublicUrl(tagPath: string): string {
    const { data } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(tagPath)

    return data.publicUrl
}

/** Commented by Desmond @ 27-April-26
 * Industry & cybersecurity best practices
 * A. Preventing orphans data
 *   - In cloud architecture, this is part of a Compensating Transaction pattern. 
 *   - If Step B (Database) fails, you must undo Step A (Storage). 
 *   - Without this function, your Supabase bucket would eventually fill up with thousands of QR codes 
 *     that don't belong to any actual asset.
 */
/** Commented by Desmond @ 25-Mar-26
 * @file lib/barcode.ts
 * @description This file helps to generate the barcode for the asset records
 * and store them in the correct bucket in Supabase.
 * This is a server-only utility, do not import into a client component
 * 
 * LATEST CHANGES
 * --------------
 *  - PNG generation is now delegated to lib/idCode/idCodeImage.ts (buildBarcodeBuffer)
 *    so the stored PNG includes the Swinburne header and asset name - matching what the 
 *    barcodePreview shows in the browser
 *  - Accepts optional 'name' parameter (asset name) embedded below the barcode.
 * 
 * PNG layout:
 *  - SWINBURNE name header with black font
 *  - Code 128 barcode with asset_id below the barcode
 *  - Asset name (if provided) - e.g Lenovo ThinkPad T480
 * 
 * DO NOTimport this file in client components because it uses supabaseAdmin
 */

// import bwipjs from 'bwip-js' // Library that draws the barcode images
import { supabaseAdmin } from '../supabase/server' // Admin access to Supabase
import { buildBarcodeBuffer } from '../idCode/idCodeImage'

// Types - only these folders are allowed
export type barcodeFolder = 'assets' // Folders storing barcode in bucket 'IdCodes'

// What is returned after the barcode is saved
export interface uploadBarcodeResult {
    tagPath: string // Relative storage path of the barcode, to be kept in the asset table
    // Public URL derived from the Supabase SDK to display the image
    publicUrl: string
}

// For showing the preview image of the barcode
export interface barcodePreviewResult {
    dataUrl: string // Base64 encoded png data url for preview
}

// ------------ CONSTANTS --------------------
const BUCKET = 'IdCodes' // Bucket name
const MAX_ASSET_ID_LENGTH = 30 // Maximum 30 chars for asset_id

// --------------- Input validation for barcode generation -------------------
// Makes sure asset_id is a string
function validateAssetId(assetId: unknown): asserts assetId is string {
    // If asset ID is not a string or empty
    if (typeof assetId !== 'string' || !assetId.trim()) {
        throw new Error('Asset ID must be a non-empty string')
    }
    // If asset ID length exceeds the maximum length
    if (assetId.length > MAX_ASSET_ID_LENGTH) {
        throw new Error(`Asset ID exceeds maximum length (${MAX_ASSET_ID_LENGTH} characters)`)
    }
    // Prevent directory traversal attacks
    if (assetId.includes('/') || assetId.includes('\\')) {
        throw new Error('Asset ID contains invalid characters')
    }
}

// ---------- Fetch the public url for the barcode path ---------------
export function getPublicUrl(tagPath: string): string {
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(tagPath)
    // Return the public url - e.g., https://...public-url
    return data.publicUrl
}

// ------------- Generate barcode PNG buffer ----------------------
// bwip-js is a rendering engine to return a PNG of the barcode using toBuffer()
// async function generateBarcodePng(text: string): Promise<Buffer> {
//     try {
//         // Make sure the asset_id format is correct
//         validateAssetId(text) // text is parsed into this function call

//         const png = await bwipjs.toBuffer({ // Returns a PNG image
//             bcid: 'code128',    // Barcode type
//             text,   // asset_id
//             scale: 3,   // 3px per image ensures good print quality
//             height: 20, // bar height in mm, which should fit a standard 2x1 inch sticker
//             includetext: true,  // human-readable id below the bars
//             textxalign: 'center',
//             textsize: 11,
//             paddingwidth: 10,
//             paddingheight: 6,
//             backgroundcolor: 'ffffff', // White color background
//             barcolor: '#111827', // Black barcode lines
//             textcolor: '#111827' // Black asset_id text
//         })
//         return Buffer.from(png) // Upload the image, which uses Buffer.from()
//     } catch (error) {
//         // Display error when failed to generate asset id barcode
//         console.error('Barcode PNG generation error', {
//             // If the text is a string, only show the first 10 characters
//             // Otherwise, show invalid
//             // This prevents leaking of sensitive data but still useful for debugging
//             assetId: typeof text === 'string' ? text.substring(0, 10) : 'Invalid',
//             message: (error as Error).message // error as Error because in Typescript, error: unknown
//         })
//         throw error
//     }
// }

/** -------------- Upload barcode to Supabase bucket ---------------------
 * @param id - Asset ID to store assets
 * @param folder - Storage folder 
 * @param name - Optional asset name drawn below the barcode ID
 * @returns Storage path and public url
 */
export async function generateAndUploadBarcode (id: string, folder: barcodeFolder, name?: string): Promise<uploadBarcodeResult> {
    try {
        // Validate and ensure asset id meets the requirements
        validateAssetId(id)
        
        const pngBuffer = await buildBarcodeBuffer({ id, name }) // Generate the barcode
        const tagPath = `${folder}/${id}.png` // Create the file path by using folder name and asset_id

        // Upload the barcode to Supabase bucket
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)   // Represents bucket name
            .upload(tagPath, pngBuffer, {
                contentType: 'image/png',
                upsert: true // Allow overwrite if re-generating
            })

        if (uploadError) {  // If upload failed
            throw new Error(`Barcode upload failed for ${id}: ${uploadError.message}`)
        }
        
        return {    // Return the result
            tagPath, 
            publicUrl: getPublicUrl(tagPath)
        }
    } catch (error) {
        console.error('Barcode generation and upload error:', {
            id: typeof id === 'string' ? id.substring(0, 10) : 'invalid',
            folder,
            message: (error as Error).message
        })
        throw error
    }
}

// ----------- Delete barcode from storage ----------------
export async function deleteBarcode(tagPath: string): Promise<void> {
    try {
        // If tagPath does not exist or is not a string
        if (!tagPath || typeof tagPath !== 'string') {
            throw new Error('Invalid tag path')
        }

        // Look into the bucket and remove the item with the tagPath
        const { error } = await supabaseAdmin.storage
            .from(BUCKET)
            .remove([tagPath])

        // Return error
        if (error) {
            // Log but don't throw the error
            console.error(`[barcode] Failed to delete orphaned file ${tagPath}:`, error.message)
        }
    } catch (error) {
        console.error('Barcode deletion error:', {
            message: (error as Error).message
        })
    }
}
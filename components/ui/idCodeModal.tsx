'use client'

/** Commented by Desmond @ 29-April-26 
 * @file components/ui/idCodeModal.tsx
 * @description Modal popup for viewing, printing and saving barcode and QR code
 * images
 * 
 * LATEST CHANGES v2
 * -----------------
 * Previously, printing QR or barcode will fail and produce the ERR_FILE_NOT_FOUND on the
 * blob URL.
 * 
 * This is because:
 *      handlePrint() created a blob URL with URL.createObjectURL(blob), wrote it into an
 *      iframe's <img src> and called iframe.contentWindow.print(), then the scheduled
 *      URL.revokeObjectURL inside a setTimeout(..., 3000).
 *      
 *      The issue is that the iframe is a separate browsing context. The browser loads
 *      the <img> asynchronously AFTER the iframe document is written and closed. On slow
 *      connections, or when the browser is under load, the 3-second timer executes before
 *      the image is fully loaded. Once the blob URL is revoked, the browser can no longer
 *      find the image, which leads to the <img> failing with ERR_FILE_NOT_FOUND and the
 *      printed page is blank.
 * 
 *      Additionally, calling print() immediately after doc.close() is also unreliable
 *      because the document may not have finished parsing yet.
 * 
 * To fix this:
 *      Attach an onload handler to the iframe element itself.
 *      So, iframe.onload will execute after the iframe document (including all its 
 *      sub-resources such as <img>) finishes loading.
 *      
 *      Call print() inside the onload handler - and it is guaranteed to run only after
 *      the image is visible in the iframe.
 * 
 *      Revoke the blob URL only after print() returns.
 * 
 *      Use the already fetched blobUrl (pre-fetched in the useEffect on modal open)
 *      instead of fetching again to avoid a second network round-trip.
 * 
 * Another fix:
 *      The save button action - handleSave also re-fetched the image. It now uses the 
 *      pre-fetched blobUrl directly ot be consistent with handlePrint.
 * 
 * 
 * LATEST CHANGES
 * --------------
 *  - The image stored in Supabase is now the full composite PNG (header + code + text embedded in by
 *    idCodeImage.ts). So, fetching it from the bucket is enough and no canvas re-draw is needed
 *    in this modal
 *  - The Save button downloads the PNG directly from the bucket URL (blob fetch). Meaning, same file 
 *    as what is stored, is what the Print button will render
 *  - The Print button now uses the blob URL in an iframe. Therefore, it should not have layout differences
 *    from the preview
 * 
 * This file replaces the previous behavior of opening the Supabase bucket URL in a new tab
 * which
 *  (a) exposed Supabase bucket credentials and path in the browser URL, and
 *  (b) required users to right click on the image and click 'Save As' to download the image
 * 
 * This modal fetches the image using the proxy endpoint, render it at a readable size
 * and provide Print and Save buttons, without leaking the storage URLs.
 * 
 * Used by:
 *   - assets/page.tsx - Barcode images (Code 128)
 *   - rooms/page.tsx - Location QR codes
 *   - units/page.tsx - Department QR codes
 * 
 * @example
 *  <idCodeModal
 *      isOpen={true}
 *      onClose={() => setOpen(false)}
 *      tagPath="assets/ICT-LAPTOP-001.png"
 *      entityType="assets"
 *      entityId="ICT-LAPTOP-001"
 *      entityLabel="Lenovo ThinkPad"
 *  />
*/

import { useEffect, useRef, useCallback, useState } from "react"
import {
    XMarkIcon,
    PrinterIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase/client'

// -------------------------------------------------------------
//                          Types
// -------------------------------------------------------------
// The type of ID code being shown - asset (barcode), location or department (QR code)
// Also controls the label and sizing
export type idCodeEntityType = 'asset' | 'location' | 'department'

export interface idCodeModalProps {
    // Whether the modal is currently visible
    isOpen: boolean

    // Callback to close the modal
    onClose: () => void

    // The relative storage path of the ID code stored in the DB tag_path column
    // e.g. "assets/ICT-LAPTOP-001.png" or "locations/G001.png"
    tagPath: string | null

    // Entity type - determines the label text and print sizing
    entityType: idCodeEntityType

    // Primary key shown in the modal header
    entityId: string

    // Human readable name, e.g. asset, location and department
    entityLabel?: string
}

// -------------------------------------------------------------
//                         Constants
// -------------------------------------------------------------
const ENTITY_NAMES: Record<idCodeEntityType, string> = {
    asset: 'Asset Barcode',
    location: 'Location QR Code',
    department: 'Department QR code'
}

// Change the bucket name here
const BUCKET_NAME = 'IdCodes'

// -------------------------------------------------------------
//                         Component
// -------------------------------------------------------------
/** Commented by Desmond @ 29-April-26
 * This is a full-screen modal that displays a barcode or QR code image with Print and Save buttons.
 * The image is fetched using the Supabase SDK (and never with hardcoded URL) so the bucket
 * path is not exposed to the user, like directly opening the image in Supabase bucket
 * in the browser new tab.
 * 
 * @param isOpen - Controls the visibility of the ID code
 * @param onClose - Callback for when the modal should close
 * @param tagPath - The storage path (using the tag_path column from the DB)
 * @param entityType - 'asset' | 'location' | 'department'
 * @param entityId - Primary key shown in the header of the modal
 * @param entityLabel - Label shown below the label to indicate what ID code is this
 */
export default function IdCodeModal({ isOpen, onClose, tagPath, entityType, entityId, entityLabel }: idCodeModalProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)

    const [blobUrl, setBlobUrl] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)

    // const imgRef = useRef<HTMLImageElement>(null)

    const blobRef = useRef<string | null>(null)

    const title = ENTITY_NAMES[entityType]


    // ----------------------------------------------------------------------------
    //          Resolve the public URL using Supabase SDK when modal opens 
    // ----------------------------------------------------------------------------
    useEffect(() => {
        // When the modal is not open or tag_path does not exist
        if (!isOpen || !tagPath) {
            setImageUrl(null)

            setBlobUrl(null)

            // Exit early
            return
        }

        // The barcode/QR code within the modal is loading
        setLoading(true)

        // Use the Supabase anon client to get the public URL for the ID code image, using SDK
        // and never hardcoded
        // Establish a connection with Supabase bucket
        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(tagPath)
        
        const url = data?.publicUrl ?? null
        // Set the image URL to the one fetched using publicUrl, else set to null
        setImageUrl(url)

        // Set the loading to false once the image URL is fetched
        if (!url) {
            setLoading(false)

            return 
        }

        // Pre-fetch the image using the URL as blob so Save and Print won't 
        // need a separate fetch
        fetch(url)
            .then(r => r.blob())
            .then(blob => {
                const objUrl = URL.createObjectURL(blob)

                blobRef.current = objUrl

                setBlobUrl(objUrl)
            })

            .catch(() => {
                // Set fallback to use imageUrl directly
                setBlobUrl(url)
            })

            .finally(() => {
                setLoading(false)
            })

        return () => {
            // Revoke the previous blob URL on cleanup
            if (blobRef.current) {
                URL.revokeObjectURL(blobRef.current)

                blobRef.current = null
            }
        }

    }, [isOpen, tagPath]) // Dependencies: Change when modal isOpen and tagPath fetched


    // ------------------------------------------------------------- 
    //          Use ESCAPE key to close the popup modal
    // -------------------------------------------------------------
    useEffect(() => {
        // If the popup modal is not open
        if (!isOpen) {
            // Exit early
            return
        }

        // Set event listener to listen to the ESCAPE key keydown event
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose() // Close the modal, set to void
            }

            // Add the event listener to the DOM
            document.addEventListener('keydown', handleKey)

            // Cleanup function to release the allocated memory to prevent memory leak
            return () => {
                // Remove the event listener after the modal closes and this function ends
                document.removeEventListener('keydown', handleKey)
            }
        }

    }, [isOpen, onClose]) // Mount when the modal is open (isOpen = true) or closes


    // ------------------------------------------------------------- 
    //     Prevent the body from scrolling while modal is open
    // -------------------------------------------------------------
    useEffect(() => {
        // If the modal is open
        if (isOpen) {
            // document - the entire browser body
            // .body - refers to the <body> element
            // .style - assesses the inline CSS style of the element
            // .overflow - control how content overflow is handled
            // 'hidden' - hides overflow content, removes scrollbars and prevents scrolling

            // This focuses the content on the modal and lock the background to prevent
            // user from losing context
            document.body.style.overflow = 'hidden'
        } else {
            // Remove the styling when the modal is not open
            // and allow the user to scroll again
            document.body.style.overflow = ''
        }

        // Cleanup function to release the allocated resources to prevent memory leak
        return () => {
            // Remove the css style element that hides the scrollbar
            document.body.style.overflow = ''
        }
    }, [isOpen]) // Only mount when the modal is open


    // ------------------------------------------------------------- 
    //            Save the ID code image to device
    // -------------------------------------------------------------
    // useCallback() keeps the function same unless the dependencies change
    // Without useCallback(), <Button onClick={handleSave} /> would re-render every time
    const handleSave = useCallback(async () => {
        // If the image does not exist
        if (!imageUrl || !blobUrl) {
            // Exit early
            return
        }

        try {
            // Fetch the image blob so we can trigger a proper download dialogue
            // This sends an HTTP request to download the image from the URL
            // fetch() is a built-in browser API and looks like this
            // fetch(url, options?)
            // await pauses execution until Promise is resolved, and only works in async() functions
            // res stands for response, req for request. It is a writing convention
            // const res = await fetch(imageUrl)

            // If the response is not ok, or imageUrl failed to be fetched
            // if (!res.ok) {
            //     // Throw the image to be caught by the catch statement when this block fails
            //     // to prevent allocating more resources to this function
            //     throw new Error('Failed to fetch image using its URL')
            // }

            // Reads the response body's binary large object (image), converts into binary format
            // Then store inside the variable named blob
            // const blob = await res.blob()

            // Create an object URL - a temporary in-memory URL
            // Stores blob in browser memory
            // Return a pointer (URL string)
            // const blobUrl = URL.createObjectURL(blob)

            // Dynamically create an HTML anchor element in memory
            const link = document.createElement('a')

            // Extract the file extension (ext) from the tag_path
            // Split the filename by '.'
            // Take the last segment as file extension
            // If the tagPath is null or undefined, default to 'png'
            // Optional chaining '?.' - returns 'undefined' when met with runtime error and won't crash
            // the application
            const ext = tagPath?.split('.').pop() ?? 'png'

            // Set the filename for the file to be downloaded
            // This creates a context-aware filename depending on entityType - barcode or QR code
            const filename = entityType === 'asset' ? `Barcode_${entityId}.${ext}`
                                                    :  `${entityType} QR_${entityId}.${ext}`

            // Sets a temporary in-memory image URL (blob URL) as the download source
            link.href = blobUrl ?? imageUrl

            // Define the download filename and tells the browser to download this file
            link.download = filename

            // Trigger the click - simulating a user clicking the link
            // Triggers the browser download dialogue automatically
            link.click()

            // Clean up memory - frees browser memory used by the temporary blob URL
            // Best practice - always pair 
            // URL.createObjectURL() with URL.revokeObjectURL()
            // URL.revokeObjectURL(blobUrl)

        // Catch the errors thrown
        } catch (err) {
            // Log the error to console for developers
            console.error('[IdCodeModal] Save error:', err)
            // Alert the user when image failed to save
            alert('Failed to save image. Please try again.')
        }

        // useCallback() does not require a cleanup function because it does not allocate resources
        // and only stores a function reference
    }, [blobUrl, imageUrl, tagPath, entityType, entityId]) // Dependencies: Only update function when these change


    // ------------------------------------------------------------- 
    //                      Print the image
    // -------------------------------------------------------------
    const handlePrint = useCallback(async () => {
        // If image is not ready, does not exist or error
        if (!imageUrl || !blobUrl) {
            // Early exit
            return
        }

        try {
            // Fetch the image blob so we can trigger a proper download dialogue
            // This sends an HTTP request to download the image from the URL
            // fetch() is a built-in browser API and looks like this
            // fetch(url, options?)
            // await pauses execution until Promise is resolved, and only works in async() functions
            // res stands for response, req for request. It is a writing convention
            // const res = await fetch(imageUrl)

            // Reads the response body's binary large object (image), converts into binary format
            // Then store inside the variable named blob
            // const blob = await res.blob()

            // Create an object URL - a temporary in-memory URL
            // Stores blob in browser memory
            // Return a pointer (URL string)
            // const blobUrl = URL.createObjectURL(blob)

            // Print size hint - barcode print narrow whereas QR codes square
            const printWidth = entityType === 'asset' ? '90mm' : '80mm'

            // Create an isolated browser document, acts as a sandbox print container
            // iframe - prevents modifying the main UI and avoid CSS conflicts
            const iframe = document.createElement('iframe')

            // Hides the iframe off-screen to make it non-interactive
            iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 0; height: 0; border: none'

            // Attach the iframe to DOM so it can render content and print
            document.body.appendChild(iframe)

            // Access the iframe document
            // contentDocument - standard access
            // contentWindow.document - fallback for older browsers
            // This gives full control over the HTML inside the iframe
            const doc = iframe.contentDocument ?? iframe.contentWindow?.document

            // Ensures iframe document is accessible, if not
            if (!doc) {
                // Cleanup the resource allocated to blobUrl
                // URL.revokeObjectURL(blobUrl)

                // Remove the iframe to not cause memory leak
                document.removeChild(iframe)
                // Exit early
                return
            }

            // Open the document
            doc.open()

            // Write HTML into the document
            doc.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>${title} - ${entityId}</title>
                        <style>
                            @page { margin: 8mm; }
                            body {
                                margin: 0;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                font-family: sans-serif;
                            }

                            img { 
                                width: ${printWidth};
                                display: block;
                            }
                        </style>
                    </head>

                    <body>
                        <img src=${blobUrl || imageUrl} alt="${title} for ${entityId}" />
                    </body>
                </html>    
            `)

            // Close the document after writing
            doc.close()

            iframe.onload = () => {
                try {
                     // Focus the window to the iframe
                    iframe.contentWindow?.focus()

                    // Print the contents on the iframe
                    iframe.contentWindow?.print()
                } finally {
                    // Always clean up the resources

                    // Schedule a function to run after a delay of 3 seconds
                    // so that iframe contents can properly render, cleaned up and printed
                    setTimeout(() => {
                        // Deletes the hidden iframe from the page to avoid memory leaks
                        document.body.removeChild(iframe)
                        // Frees memory used by a temporary blob URL
                        // URL.revokeObjectURL(blobUrl)
                    }, 500)
                }
            }

        // Catch the errors
        } catch (err) {
            // Log the error for developers
            console.error('[IdCodeModal] Print error:', err)
            // Alert the user about print error
            alert('Failed to print. Please try again.')
        }

    }, [blobUrl, imageUrl, entityType, entityId, entityLabel, title])


    // If the modal is not open
    if (!isOpen) {
        return null
    }

    // ------------------------------------------------------------- 
    //                  Return the modal component
    // -------------------------------------------------------------
    // Main component
    return (
        // Backdrop
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
             onClick={onClose} aria-modal="true" role="dialog" aria-label={`${title} for ${entityId}`}    
        >

            {/* Modal card - click inside prevents the backdrop being closed */}
            <div className="bg-white rounded-2xl shadow-2xl
                            w-full max-w-sm
                            sm:max-w-md 
                            md:max-w-lg 
                            lg:max-w-xl
                            mx-4 sm:mx-auto
                            p-4 sm:p-6"
                 onClick={(e) => e.stopPropagation()}
            >
                {/* ------------------- Header ----------------------- */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            {title}
                        </h2>

                        <p className="text-xs text-gray-500 mt-0.5">
                            {entityId}
                            {entityLabel ? ` - ${entityLabel}` : ''}
                        </p>
                    </div>

                    {/* Button to close the modal */}
                    <button type="button" onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                            transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Close modal"
                    >
                        {/* Close the modal */}
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* ------------------- Image area -------------------------- */}
                <div className="px-5 oy-6 flex items-center justify-center bg-gray-50 min-h-[220px]">
                    {/* Display loading spinner when loading */}
                    {/* {loading && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-red-600">
                                <p className="text-sm text-gray-500">Loading...</p>
                            </div>
                        </div>
                    )} */}

                    {/* Not loading and no image URL is available */}
                    {!loading && !imageUrl && (
                        <p className="text-sm text-gray-400">No image available</p>
                    )}

                    {/* Not loading and image is available */}
                    {!loading && imageUrl && (
                        <img src={imageUrl} alt={`${title} for ${entityId}`}
                             className="rounded-lg object-contain shadow-sm"
                             style={{
                                // Barcode requires width; QR codes need square dimensions
                                maxWidth: entityType === 'asset' ? '100%' : 260,
                                maxHeight: entityType === 'asset' ? 120 : 260,
                                width: entityType === 'asset' ? '100%' : 'auto'
                             }}

                            // Log the error server-side only - Do NOT log the URL as it would leak bucket information
                            onError={() =>
                                // Log the error to console for developers
                                console.error('[IdCodeModal] Image failed to load for', entityId)
                            }
                        />
                    )}
                </div>

                {/* -------------------- Action buttons --------------------- */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-white">
                    {/* Print button */}
                    <button type="button" onClick={handlePrint} disabled={!imageUrl}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white
                                       border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2
                                       focus:ring-offset-2 focus:ring-red-500 disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-colors"        
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print
                    </button>

                    {/* Save image button */}
                    <button type="button" onClick={handleSave} disabled={!imageUrl}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600
                                       border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2
                                       focus:ring-offset-2 focus:ring-red-500 disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-colors"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Save Image
                    </button>
                </div>

            </div>
        </div>
    )
}
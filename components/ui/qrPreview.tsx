// components/ui/qrPreview.tsx
'use client'

// Commented by Desmond @ 28-April-26
// TODO:
// Current problem is that there's no debouncing and this component runs on every keystroke
// There should be a debounce or a delay before QR preview is regenerated again

/** Commented by Desmond @ 27-April-26
 * @file components/ui/qrPreview.tsx
 * @description Client-side QR code preview component for the Add Location and Add Department forms.
 * 
 * LATEST CHANGES:
 * ---------------
 *  - Now uses buildQrDataUrl from lib/idCode/idCodeImage.ts (the same function path used by the server)
 *    so what you see in the preview is exactly what gets saved to Supabase storage
 *  - Removed the colored HTML header strip (blue/green box around the card)
 *    The university name, entity type label, url and name are now embedded into the PNG by drawQrCanvas.
 *    Thus, removing the need for extra HTML wrappers.
 *  - Print and Save uses the same composite data URL so there is no more layout mismatch
 *  - QR code color is now #000000 pure black for maximum scan clarity
 * 
 * Mirrors the barcodePreview component for assets, but renders a QR code instead of a barcode.
 * Shows a live preview as the user types the ID, indicates whether the ID is available or already
 * taken and provides Print and Save buttons - without ever exposing the Supabase bucket URLs to the
 * user via a new tab (which was a security concern with the old design).
 * 
 * The QR is generated client-side for preview using the `qrcode` npm package (browser-compatible).
 * The server-generated PNG (stored in Supabase) is separate and only created on form submission.
 * 
 * @example
 *   <QrPreview
 *      value="G001"
 *      entityType="location"
 *      label="Room G-001"
 *      isDuplicate={false}
 *      showControls={true}
 *   />
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
    ClipboardDocumentIcon,
    CheckIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    PrinterIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { buildQrDataUrl, buildScanUrl } from '@/lib/idCode/idCodeImage'
import type { qrFolder } from '@/lib/idCode/idCodeImage'

// -------------------------------------------------------------
//                          Types
// -------------------------------------------------------------
// Which entity this QR preview represents
export type qrEntityType = 'location' | 'department'

// Reusable component API which states what attributes the QR preview prop has
interface qrPreviewProps {
    // The ID value to encode in the QR (location_id or department_id)
    value: string

    // 'location' or 'department' - controls label text and QR color accent
    entityType: qrEntityType

    // Optional human-readable label shown inside the preview card (e.g. room name)
    label?: string

    // When true, renders the duplicate warning banner (turns the border red)
    isDuplicate?: boolean

    // Shows the Print and Save buttons
    showControls?: boolean

    // Extra Tailwind classes on the outer wrapper
    className?: string
}

// -------------------------------------------------------------
//                          Constants
// -------------------------------------------------------------
// Base URL for the static scan redirect - same value as the server utility.
// Uses NEXT_PUBLIC_env var so it's available in the browser.
// const BASE_URL =
//     (typeof window !== 'undefined'
//         ? process.env.NEXT_PUBLIC_APP_URL
//         : undefined) ?? 'https://swinburne-assets.vercel.app'


// -------------------------------------------------------------
//                       Helper function
// -------------------------------------------------------------
// Helps to determine Supabase folder based on the entity type
function entityToFolder(entityType: qrEntityType): qrFolder {
    return entityType === 'location' ? 'locations' : 'departments'
}

/** Commented by Desmond @ 15-May-26: Removed entirely
 * Color scheme per entity type - distinguish between location QRs (blue accent)
 * from department QRs (green accent) at a glance, which is the industry convention
 * for color-coded tags
 * 
 * Map the color to the corresponding entity and create centralized styling
 */
// const ENTITY_STYLES: Record<qrEntityType, { accent: string; badgeBg: string; badgeText: string; headerBg: string}>
// = {
//     location: {
//         accent: '#1d4ed8', // Blue-700
//         badgeBg: '#eff6ff', // Blue-50
//         badgeText: '#1d4ed8', // Blue-700
//         headerBg: '#1e40af' // Blue-800
//     },

//     department: {
//         accent: '#15803d', // Green-700
//         badgeBg: '#f0fdf4', // Green-50
//         badgeText: '#15803d', // Green-700
//         headerBg: '#166534' // Green-800
//     }
// }

// // Decouple the UI text from the logic
// // Only the location and department module uses QR codes
// const ENTITY_LABELS: Record<qrEntityType, string> = {
//     location: 'Location',
//     department: 'Department'
// }


// -------------------------------------------------------------
//                         Component
// -------------------------------------------------------------
/**
 * QR code preview card rendered inside the Add Location / Add Department form.
 * 
 * @param value - The ID value being encoded (shown as QR + text)
 * @param entityType - 'location' | 'department'
 * @param label - Optional friendly name displayed below the QR
 * @param isDuplicate - Whether the current ID is already taken
 * @param showControls - Show Print + Save buttons
 */
const QrPreview =({ value, entityType, label, isDuplicate = false, showControls = true, className = '' }: qrPreviewProps) => {
    // Base64 data URL of the QR code rendered by the browser
    const [qrDataUrl, setQrDataUrl] = useState<string>('')

    // Whether the QR is currently being generated
    const [generating, setGenerating] = useState(false)

    // Copy-to-clipboard feedback
    const [copied, setCopied] = useState(false)

    // Used to cancel stale async updates when value changes quickly
    const abortRef = useRef(false)

    // References to the hidden canvas used for saving and printing
    // Avoids re-rendering and DOM querying
    // const canvasRef = useRef<HTMLCanvasElement>(null)

    // ID is valid when length is not empty
    const isValid = value.trim().length > 0
    
    // Map the styles to the corresponding entity type (location or department)
    // ENTITY_STYLES is an object
    // entityType is a key
    // Access using the bracket notation like ENTITY_STYLES[entityType], entityType is location for example
    // Result - { accent: '', badgeBg: '', ... }
    // const styles = ENTITY_STYLES[entityType]
    // const entityLabel = ENTITY_LABELS[entityType]

    // Check if the user has typed something, if valid then build the scan URL.
    // e.g. URL = https://.../scan/location/G001
    // .trim() removes whitespaces or blanks
    const folder = entityToFolder(entityType)
    const scanUrl = isValid ? buildScanUrl(folder, value.trim()) : ''
    const entityLabel = entityType === 'location' ? 'Location' : 'Department'

    // -------------------------------------------------------------
    //        Generate QR code whenever the value changes
    // -------------------------------------------------------------
    useEffect(() => {
        // If the ID is empty or not valid
        if (!isValid) {
            // Clear QR image
            setQrDataUrl('')
            // Exit early
            return
        }

        // Cancellation flag - Prevents state updates after component unmount or re-render
        abortRef.current = false
        // Indicate that QR generation is in progress
        setGenerating(true)

        // Dynamically import 'qrcode' so it only loads in the browser and only
        // when the user actually types an ID 
        // This is lazy loading where package is only imported when needed
        // import('qrcode').then((QRCode) => {
        //     // QR code generation - generate a QR code as a Base64 image string
        //     // Format: QRCode.toDataURL(scanUrl, options)
        //     QRCode.toDataURL(scanUrl, {
        //         errorCorrectionLevel: 'M', // QR still scannable up to 15% damage
        //         margin: 3, // White space padding around QR
        //         width: 400, // Output size in pixels (400 x 400) 
        //         color: {
        //             dark: '#000000', // Foreground color
        //             light: '#ffffff' // Background color
        //         }
        //     })
        //     // Success handler - store the generated QR image in state
        //     .then((url) => {
        //         if (!cancelled) {
        //             // Store the image string in state
        //             setQrDataUrl(url)
        //         }
        //     })
        //     // Catch errors
        //     .catch((err: unknown) => {
        //         // Log error to console
        //         console.error('[QrPreview] QR generation error:', err)
        //     })
        //     // Stops loading state regardless of success or failure
        //     .finally(() => {
        //         if (!cancelled) {
        //             // Indicate the QR generating process has stopped
        //             setGenerating(false)
        //         }
        //     })
        // })

        buildQrDataUrl({ id: value.trim(), folder, name: label })
            .then(url => {
                if (!abortRef.current) {
                    setQrDataUrl(url)
                }
            })

            .catch(err => {
                console.error('[QrPreview] QR generation error:', err)
            })

            .finally(() => {
                if (!abortRef.current) {
                    setGenerating(false)
                }
            })

        // Cleanup function
        return () => {
            abortRef.current = true
        }

    }, [value, folder, label, isValid]) // Generate QR code every time input value changes

    // -------------------------------------------------------------
    //              Copy scan URL to clipboard
    // -------------------------------------------------------------
    // useCallback to memorize function to prevent re-creation
    const handleCopy = useCallback(async () => {
        // Prevent execution when no valid URL exists
        if (!scanUrl) {
            // Exit early
            return
        }

        try {
            // Copy the scan URL to clipboard
            await navigator.clipboard.writeText(scanUrl)
            // Set copied to true
            setCopied(true)
            // Reset copied to false after 2 seconds
            setTimeout(() => setCopied(false), 2000)
            // Catch errors
        } catch {
            // Fallback for browsers that block clipboard API
            try {
                // Create textarea to hold text
                const ta = document.createElement('textarea')
                // Assign the value
                ta.value = scanUrl
                // Move the element off-screen
                ta.style.cssText = 'position:fixed; left: -9999px; top: 0'
                // Add to DOM
                document.body.appendChild(ta)
                // Select the content
                ta.focus()
                ta.select()
                // Execute the copy command
                document.execCommand('copy')
                // Cleanup and prevent DOM clutter
                document.body.removeChild(ta)
                // Copied is true
                setCopied(true)
                // Handle errors
            } catch (_err) {
                alert('Could not copy to clipboard. Please copy manually.')
            }
        }
    }, [scanUrl]) // Function only recreated when this changes

    // -------------------------------------------------------------
    //          Draw QR onto canvas (for print/save)
    // -------------------------------------------------------------
    // canvas: HTMLCanvasElement - Target canvas to draw on
    // const drawToCanvas = useCallback( (canvas: HTMLCanvasElement): Promise<void> => {
    //     // Canvas drawing can take time loading
    //     // Promise ensures the caller know when the drawing is done
    //     return new Promise((resolve, reject) => {
    //         // Get canvas context
    //         // ctx: drawing API for canvas
    //         const ctx = canvas.getContext('2d')

    //         // If failure or QR image not available
    //         if (!ctx || !qrDataUrl) {
    //             reject(new Error('Canvas context or QR data not available'))
    //             return
    //         }

    //         // Canvas dimensions
    //         const W = 500
    //         const QR_SIZE = 340
    //         const PADDING = 20
    //         const HEADER_H = 56
    //         const FOOTER_H = 72
    //         const H = HEADER_H + QR_SIZE + FOOTER_H + PADDING * 2

    //         // Apply the dimensions
    //         canvas.width = W
    //         canvas.height = H

    //         // Drawing operations
    //         // Background
    //         ctx.fillStyle = '#ffffff'
    //         ctx.fillRect(0, 0, W, H)

    //         // Header strip
    //         // Draw colored header (blue/green) depending on the entity
    //         ctx.fillStyle = styles.headerBg
    //         ctx.fillRect(0, 0, W, HEADER_H)

    //         // Header text: "SWINBURNE UNIVERSITY OF TECHNOLOGY"
    //         ctx.fillStyle = '#ffffff'
    //         ctx.font = 'bold 13px sans-serif'
    //         ctx.textAlign = 'center'
    //         // W / 2 to center the alignment
    //         ctx.fillText('SWINBURNE UNIVERSITY OF TECHNOLOGY', W / 2, 42)

    //         // Entity label in header: "Location: G001"
    //         ctx.font = '11px sans-serif'
    //         ctx.fillText(`${entityLabel}: ${value.trim()}`, W / 2, 42)

    //         // Create the image object for QR code and draw it on the canvas once loaded
    //         const img = new Image()
    //         // Load the image
    //         img.onload = () => {
    //             // xOffset is the center alignment
    //             const xOffset = (W - QR_SIZE) / 2
    //             // Draw the QR code image to the canvas
    //             // drawImage(img, dx, dy, dWidth, dHeight)
    //             ctx.drawImage(img, xOffset, HEADER_H + PADDING, QR_SIZE, QR_SIZE)

    //             // Footer: friendly label
    //             // Draws a label below the QR code on the canvas, e.g. (Room G-001), if it exists
    //             if (label) {
    //                 // Set the text color
    //                 ctx.fillStyle = '#111827'
    //                 // Weight, size and font family
    //                 ctx.font = 'bold 14px sans-serif'
    //                 // Align text to the center
    //                 ctx.textAlign = 'center'
    //                 // Draw the text
    //                 // fillText(text, x, y)
    //                 ctx.fillText(label, W / 2, HEADER_H + PADDING + QR_SIZE + 24)
    //             }

    //             // Footer: scan URL hint
    //             // Set the text color
    //             ctx.fillStyle = '#6b7280'
    //             // Font size and font family
    //             ctx.font = '9px monospace'
    //             // Draw the text
    //             // fillText(text, x, y)
    //             ctx.fillText(scanUrl, W / 2, HEADER_H + PADDING + QR_SIZE + 46)

    //             // Marks a Promise as resolved when the drawing is done
    //             // resolve( 'empty' ) because Promise<void> does not return any value
    //             // SUCCESS
    //             resolve()
    //         }
    //         // Assign the Promise's reject function as the error handler for the image
    //         // Mark the Promise as failed if image fails to load
    //         // FAILURE
    //         img.onerror = reject
    //         // Trigger the image loading by assigning the QR data URL to the src attribute
    //         // Browser begins to load the image
    //         img.src = qrDataUrl
    //     })
    // }, [qrDataUrl, entityLabel, value, label, scanUrl, styles.headerBg])

    // -------------------------------------------------------------
    //                     Save QR code as PNG
    // -------------------------------------------------------------
    const handleSave = useCallback(async () => {
        // useRef to give access to the DOM element
        // const canvas = canvasRef.current
        
        // If canvas is not mounted OR QR image is not generated yet
        // if (!canvas || !qrDataUrl) {
        if (!qrDataUrl) {
            // Exit early
            return
        }

        try {
            // Draw the QR and the layout onto the canvas and wait until it finishes drawing
            // await drawToCanvas(canvas)
            // Create a temporary anchor element and use it to trigger download of the canvas content
            const link = document.createElement('a')
            // Set the file name
            link.download = `qr-${entityType}-${value.trim()}.png`
            // Convert the canvas content to an image (data URL) and set it as the href of the anchor
            link.href = qrDataUrl
            // Simulate a click on the anchor to trigger the browser to download the file
            link.click()
            // Catch the errors
        } catch (err) {
            // Log the error to the console for developers
            console.error('[QrPreview] Save error:', err)
            // Alert the user that saving failed
            alert('Failed to save QR code image.')
        }
    }, [qrDataUrl, entityType, value])

    // -------------------------------------------------------------
    //                       Print QR code
    // -------------------------------------------------------------
    // Promise<void> because it's async
    const handlePrint = useCallback(async () => {
        // Retrieve the canvas element from the ref
        // const canvas = canvasRef.current

        // If canvas is not mounted OR QR image is not generated yet
        // if (!canvas || !qrDataUrl) {
        if (!qrDataUrl) {
            // Exit early
            return
        }

        try {
            // // Draw the QR and the layout onto the canvas and wait until it finishes drawing
            // await drawToCanvas(canvas)
            // // Convert the canvas content to a data URL (base64-encoded image)
            // const dataUrl = canvas.toDataURL('image/png')

            // Open an invisible iframe and print only the QR image
            const iframe = document.createElement('iframe')

            // Move the iframe off-screen and hide it - this is a common technique to print 
            // specific content without opening a new tab or affecting the main page
            iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 0; height: 0'
            // Add the iframe to the document body so that it becomes part of the DOM and can be manipulated
            document.body.appendChild(iframe)
            // Get the document context of the iframe to write custom HTML for printing
            const doc = iframe.contentDocument ?? iframe.contentWindow?.document

            // If we cannot access the document context for some reason
            if (!doc) {
                // Exit early
                return
            }

            // Open the document
            doc.open()
            // Write a minimal HTML structure containing the QR code image into the iframe's document
            doc.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>QR Code - ${entityLabel}: ${value.trim()}</title>
                        <style>
                            @page { margin: 10mm; }
                            body { margin: 0; display: flex; flex-direction; column; align-items: center; font-family: sans-serif; }
                            img { max-width: 180mm; }
                        </style>
                    </head>

                    <body>
                        <img src="${qrDataUrl}" alt="QR code for ${entityLabel} ${value.trim()}" />
                    </body>
                </html>
            `)
            // Close the document
            doc.close()

            // Focus the iframe window
            iframe.contentWindow?.focus()
            // Trigger print to print the content of the iframe (QR code)
            iframe.contentWindow?.print()

            // Remove iframe after a short delay
            setTimeout(() => document.body.removeChild(iframe), 2000)
            // Catch errors
        } catch (err) {
            // Log the error to the console for developers
            console.error('[QrPreview] Print error:', err)
            // Alert the user that printing failed
            alert('Failed to print QR code.')
        }
    }, [qrDataUrl, entityLabel, value])

    // -------------------------------------------------------------
    //              Empty state (no QR code generated)
    // -------------------------------------------------------------
    // If the input value is not valid or empty, show the placeholder content instead of the QR preview card
    if (!isValid) {
        return (
            <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center ${className}`}>
                <div className="rounded-full bg-gray-100 p-3 mb-3">
                    {/* Triangle icon for the barcode preview section */}
                    <ExclamationTriangleIcon className='h-6 w-6 text-gray-400' />
                </div>

                <p className="text-sm font-medium text-gray-500">
                    Awaiting {entityLabel} ID
                </p>

                <p className="text-sm font-medium text-gray-500">
                    QR code will appear here once an ID is entered
                </p>
            </div>
        )
    }

    // -------------------------------------------------------------
    //                   Main component (card)
    // -------------------------------------------------------------
    return (
        <div className={`relative overflow-hidden rounded-xl border border-sm transition-all 
            ${isDuplicate ? 'border-red-300 ring-2 ring-red-400/40 bg-red-50/30'
                          : 'border-gray-200 ring-1 ring-black/5 bg-white'
            } ${className} `}
            role="region"
            aria-label={`QR code preview for ${entityLabel} ${value}`}
        >

            {/* Warning about duplicate ID */}
            {isDuplicate && (
                <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    {/* Exclamation icon stating duplicate ID is not allowed */}
                    <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 text-red-500"
                        aria-hidden="true"
                    />

                    <p className="text-xs font-medium text-red-700">
                        {entityLabel} ID already exists! Choose a different ID before saving.
                    </p>
                </div>
            )}


            {/* -------------------- Utility toolbar --------------------------- */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                    {/* Color-coded badges: Blue = location, green = department */}
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset">
                        {entityLabel} QR
                    </span>

                    <span className="text-sm font-medium text-gray-400">Preview</span>
                </div>
            

            {/* ----------------------- Show controls -------------------------- */}
            {showControls && (
                <div className="flex items-center gap-1.5">
                    {/* Copy the scan URL */}
                    <button type="button" onClick={handleCopy} title="Copy scan URL"
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py1.5 text-xs font-semibold transition-all focus:outline-none
                                        focus:ring-2 focus:ring-red-500 ${
                                            copied ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
                                                   : 'bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200'
                                        }`}
                    >
                        {copied ? (
                            <>
                                <CheckIcon className="h-3.5 w-3.5" />
                                Copied
                            </>
                        ) : (
                            <>
                                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                Copy URL
                            </>
                        )}
                    </button>


                    {/* Save the PNG */}
                    <button type="button" onClick={handleSave} disabled={!qrDataUrl} title="Save QR code as PNG"
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600
                                       hover:bg-gray-100 ring-1 ring-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-500
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        Save
                    </button>


                    {/* Print the PNG */}
                    <button type="button" onClick={handlePrint} disabled={!qrDataUrl} title="Print QR code"
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600
                                       hover:bg-gray-100 ring-1 ring-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-500
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <PrinterIcon className="h-3.5 w-3.5" />
                        Print
                    </button>

                </div>
                )}
            </div>

            {/* ----------------------- QR Image -------------------------- */}
            <div className="flex w-full items-center justify-center py-4 px-4">
                {/* Generating the QR code image */}
                {generating && (
                    <div className="flex flex-col items-center gap-2 py-8">
                        {/* Generating the QR image */}
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200" />
                        <p className="text-xs text-gray-400">Generating QR image</p>
                    </div>
                )}

                {/* Display the generated QR code image */}
                {!generating && qrDataUrl && (
                    <img src={qrDataUrl} alt={`QR code for ${entityLabel} ${value}`} 
                         className="rounded-md" style={{ width: 240, height: 240 }}
                    />
                )}
            </div>

            {/* --------------------- Footer metadata ---------------------- */}
            {/* <div className="border-t border-gray-100 px-4 pt-3 pb-4">
                {label && (
                    <p className="truncate text-center text-xs font-semibold text-gray-700" title={label}>
                        {label}
                    </p>
                )}

                <p className="mt-1 text-center text-[10px] text-gray-400 font-mono break-all leading-relaxed">
                    {scanUrl}
                </p>

                <p className="mt-1 text-center text-[10px] text-gray-400">
                    Static scan URL - permanent even if the destination page route changes
                </p>
            </div> */}

        </div>
    )
}

// Memoize the component to prevent unnecessary re-renders and improve performance, 
// especially when used in forms with multiple inputs
// And export it so it can be imported in the Add Location and Add Department forms
export default memo(QrPreview)
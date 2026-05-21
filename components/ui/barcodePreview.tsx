'use client' // Makes everything client components

/** Commented by Desmond @ 23-Mar-26
 * @file components/ui/barcodePreview.tsx
 * @description This component shows the live preview for the barcode based
 * on the asset_id entered by the user in the Add Asset form.
 * 
 * LATEST CHANGES:
 * ---------------
 *  - Now uses buildBarcodeDataUrl from lib/idCode/idCodeImage.ts - the same function path as the server's
 *    buildBarcodeBuffer, so the preview would be the same as the stored PNG
 *  - Swinburne header is now embedded into the PNG and not rendered as a HTML around the image. This
 *    makes Save and Print consistent
 *  - Asset name is also embedded below the barcode ID number (industry standard)
 *  - Removed dependency on react-barcode for the preview, now using canvas-based
 * 
 *  COMPOSITE PNG LAYOUT (baked in, matches lib/idCode/idCodeImage.ts):
 *   _______________________________________
 *   |  SWINBURNE UNIVERSITY OF TECHNOLOGY |    - white on black strip
 *   |-------------------------------------|
 *   |   [=====CODE 128 BARCODE=====]      |
 *   |        ICT-LAPTOP-001               |    - using by bwip-js includetext
 *   |        Lenovo ThinkPad T480         |    - asset name (if provided)
 *   ---------------------------------------
 */

// useState remembers the state; useMemo cache the result so no need to recalculate;
// useCallback cache function so it doesn't recreate; memo prevents unnecessary re-render
import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react'
// import Barcode from 'react-barcode' // Draws the barcode
import {
    ExclamationTriangleIcon,
    PrinterIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { buildBarcodeDataUrl } from '@/lib/idCode/idCodeImage'

// Define what is passed into the component (props are input)
interface barcodePreviewProps {
    value: string   // Barcode value
    label?: string  // Optional name
    showControls?: boolean    // Show the copy button
    className?: string  // Extra styling
    isDuplicate?: boolean   // Show warning if it's duplicate
}

// -------------------------------------------------------------
//         Component that builds the barcode preview
// -------------------------------------------------------------
const barcodePreview = ({
    value,
    label,
    showControls = true,
    className = '',
    isDuplicate = false
}: barcodePreviewProps) => {
    const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null)
    const [generating, setGenerating] = useState(false)
    const abortRef = useRef(false)

    const isValid = useMemo(() => value.trim().length > 0, [value]) // Value cannot be empty, empty spaces are trimmed and don't recompute unless value changed
    
    // -------------------------------------------------------------
    //      Generate data URl png whenever value or label changes
    // -------------------------------------------------------------
    useEffect(() => {
        if (!isValid) {
            setBarcodeDataUrl(null)
            return
        }

        abortRef.current = false
        
        setGenerating(true)

        buildBarcodeDataUrl({ id: value.trim(), name: label })
            .then(url => {
                if (!abortRef.current) {
                    setBarcodeDataUrl(url)
                }
            })

            .catch(err => {
                console.error('[BarcodePreview] generation error:', err)
            })

            .finally(() => {
                if (!abortRef.current) {
                    setGenerating(false)
                }
            })

            return() => {
                abortRef.current = true
            }

    }, [value, label, isValid])


    // -------------------------------------------------------------
    //                          Save PNG
    // -------------------------------------------------------------
    const handleSave = useCallback(() => {
        // If barcode image does not exist
        if (!barcodeDataUrl) {
            // Exit early
            return 
        }

        try {
            // Draw the barcode and the layout onto the canvas and wait until it finishes drawing
            // await drawToCanvas(canvas)
            // Create a temporary anchor element and use it to trigger download of the canvas content
            const link = document.createElement('a')
            // Set the file name
            link.download = `barcode-${value.trim()}.png`
            // Convert the canvas content to an image (data URL) and set it as the href of the anchor
            link.href = barcodeDataUrl
            // Simulate a click on the anchor to trigger the browser to download the file
            link.click()
            // Catch the errors
        } catch (err) {
            // Log the error to the console for developers
            console.error('[BarcodePreview] Save error:', err)
            // Alert the user that saving failed
            alert('Failed to save barcode image.')
        }

    }, [barcodeDataUrl, value])


    // -------------------------------------------------------------
    //                          Print PNG
    // -------------------------------------------------------------
    const handlePrint = useCallback(() => {
        // If barcode image does not exist
        if (!barcodeDataUrl) {
            // Exit early
            return
        }

        try {
            // // Draw the barcode and the layout onto the canvas and wait until it finishes drawing
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
            // Write a minimal HTML structure containing the barcode image into the iframe's document
            doc.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Barcode - ${value.trim()}</title>
                        <style>
                            @page { margin: 8mm; }
                            body { margin: 0; display: flex; flex-direction; column; align-items: center; font-family: sans-serif; }
                            img { width: 90mm; }
                        </style>
                    </head>

                    <body>
                        <img src="${barcodeDataUrl}" alt="Barcode code for ${value.trim()}" />
                    </body>
                </html>
            `)
            // Close the document
            doc.close()

            // Focus the iframe window
            iframe.contentWindow?.focus()
            // Trigger print to print the content of the iframe (barcode)
            iframe.contentWindow?.print()

            // Remove iframe after a short delay
            setTimeout(() => document.body.removeChild(iframe), 2000)
            // Catch errors
        } catch (err) {
            // Log the error to the console for developers
            console.error('[BarcodePreview] Print error:', err)
            // Alert the user that printing failed
            alert('Failed to print barcode.')
        }

    }, [barcodeDataUrl, value])


    // If the value is empty, show this content
    // This is the icon at the center of the barcode preview section
    if (!isValid) {
        return (
            <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center transition-all ${className}`}>
                <div className="rounded-full bg-gray-100 p-3 mb-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">Awaiting Asset ID</p>
                <p className="text-xs text-gray-400 mt-1">Barcode will appear once an ID is entered</p>
            </div>
        )
    }

    // Main contents - displayed when there's value entered into the asset_id section
    return (
        <div className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-al ${
            isDuplicate ? 'border-red-300 ring-2 ring-red-400/40 bg-red-50/30'
                        : 'border-gray-200 ring-1 ring-black/5'    
        } ${className}`}
             role="region" aria-label={`Barcode preview for ${value}`}
        >

            {/* Utility headers */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                    {/* Display the algorithm used for the barcode generator */}
                    {/* <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-600/20">
                        Code 128
                    </span> */}
                    {/* State that this is a preview */}
                    <span className="text-sm font-medium text-gray-400">Preview</span>
                </div>

                {showControls && (
                    <div className="flex items-center gap-1.5">

                        {/* Save barcode PNG button */}
                        <button type="button" onClick={handleSave} disabled={!barcodeDataUrl}
                                title="Save barcode as PNG"
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600
                                       hover:bg-gray-100 ring-1 ring-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-500
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Save
                        </button>


                        {/* Print barcode button */}
                        <button type="button" onClick={handlePrint} disabled={!barcodeDataUrl}
                                title="Print barcode"
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600
                                       hover:bg-gray-100 ring-1 ring-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-500
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <PrinterIcon className="h-3.5 w-3.5" /> Print
                        </button>
                        
                    </div>
                )}
            </div>

            {/* Barcode SVG display */}
            <div className="flex w-full items-center justify-center overflow-x-auto px-4 py-3">
                {/* <div className="min-w-fit">
                    <Barcode 
                        value={value}   // Barcode value
                        format="CODE128"    // Barcode format
                        width={1.8} // Width
                        height={70} // Height
                        displayValue={true} // Whether to display the asset_id below the barcode
                        fontSize={13}   // Font size for the asset_id displayValue below the barcode
                        margin={0}  // Margin for the item
                        background="transparent"    // Background color for the barcode SVG
                        lineColor="#111827" // Line color for the barcode strip
                        font="monospace" // Font for the asset_id displayed below the barcode
                    />
                </div> */}
                {!generating && barcodeDataUrl && (
                    <img src={barcodeDataUrl} alt={`Barcode for ${value}`}
                         className="rounded border border-gray-100 shadow-sm"
                         style={{ maxWidth: '100%', height: 'auto' }}
                    />
                )}
            </div>

            {/* Metadata footer */}
            {/* <div className="border-t border-gray-50 px-4 pb-3 pt-2">
                <p className="text-center text-[10px] text-gray-400 font-mono">
                    {value}
                </p>
            </div> */}
        </div>
    )
}

// Memorize the component to prevent re-render unless props change
export default memo(barcodePreview)
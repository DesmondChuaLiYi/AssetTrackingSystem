'use client' // Makes everything client components

/** Commented by Desmond @ 23-Mar-26
 * @file components/ui/barcodePreview.tsx
 * @description This component shows the live preview for the barcode based
 * on the asset_id entered by the user in the Add Asset form.
 * It also has a copy button to copy the asset_id to clipboard, and shows
 * a warning if the asset_id is already taken.
 */

// useState remembers the state; useMemo cache the result so no need to recalculate;
// useCallback cache function so it doesn't recreate; memo prevents unnecessary re-render
import { useState, memo, useMemo, useCallback } from 'react'
import Barcode from 'react-barcode' // Draws the barcode
import { ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

// Define what is passed into the component (props are input)
interface barcodePreviewProps {
    value: string   // Barcode value
    label?: string  // Optional name
    showCopyButton?: boolean    // Show the copy button
    className?: string  // Extra styling
    isDuplicate?: boolean   // Show warning if it's duplicate
}

// Component that builds the barcode preview UI
const barcodePreview = ({
    value,
    label,
    showCopyButton = true,
    className = '',
    isDuplicate = false
}: barcodePreviewProps) => {
    const [copied, setCopied] = useState(false) // Tracks if the user clicked 'copy'
    const isValid = useMemo(() => value.trim().length > 0, [value]) // Value cannot be empty, empty spaces are trimmed and don't recompute unless value changed
    // When user clicks copy, this method runs
    const handleCopy = useCallback(async () => {
        if (!isValid) { // Don't copy empty values
            return
        }
        
        try {
            await navigator.clipboard.writeText(value) // Copies the barcode value to clipboard
            setCopied(true) 
            setTimeout(() => setCopied(false), 2000) // Show "Copied" for 2 seconds
        } catch (err) { // If clipboard fails
            console.error('[BarcodePreview] Failed to copy:', err)

            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea') // Create a hidden box
                textArea.value = value  // Put the barcode value inside
                // Ensure the textarea is hidden but part of the document
                textArea.style.position = 'fixed'
                textArea.style.left = '-9999px'
                textArea.style.top = '0'    // These ensure the user cannot see the box but browser still sees it
                document.body.appendChild(textArea) // Add the text area to the page
                textArea.focus() // Focus it like clicking inside the box
                textArea.select() // Highlight the text
                const successful = document.execCommand('copy') // Simulates CTRL + C
                document.body.removeChild(textArea) // Removes the hidden element

                if (successful) { // If copy worked
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000) // Show "Copied" then reset after 2 seconds
                }
            } catch (_err) {
                // When everything above failedS
                alert('Failed to copy to clipboard. Please try copying manually.')
            }
        }
    }, [value])

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

            {/* Duplicate warning banner - check if asset ID is already taken */}
            {isDuplicate && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
                    <p className="text-xs font-medium text-red-700">
                        Asset ID already exists - choose a different ID before saving
                    </p>
                </div>
            )}

            {/* Utility headers */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Display the algorithm used for the barcode generator */}
                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-600/20">
                        Code 128
                    </span>
                    {/* State that this is a preview */}
                    <span className="text-sm font-medium text-gray-400">Preview</span>
                </div>

                {showCopyButton && (
                    // The copy button
                    <button type="button" onClick={handleCopy} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-red-500
                        ${copied ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200'
                        }`}>
                        {copied ? (
                            // Will display as "Copied" after the user clicks the copy button
                            <><CheckIcon className="h-3.5 w-3.5" /> Copied</>
                        ) : (
                            // Display the copy ID button
                            <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copy ID</>
                        )}
                    </button>
                )}
            </div>

            {/* Barcode SVG display */}
            <div className="flex w-full items-center justify-center overflow-x-auto py-2 scrollbar-hide">
                <div className="min-w-fit">
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
                </div>
            </div>

            {/* Metadata footer */}
            {(label || value) && (
                // border-t creates the tiny line above the 'System generated barcode' line
                <div className="mt-4 border-t border-gray-100 pt-3"> {/* Whole bottom section for the barcode preview */}
                    {label && (
                        <p className="truncate text-center text-xs font-semibold text-gray-700" title={label}>
                            {label}
                        </p>
                    )}
                    <p className="mt-1 text-center text-xs text-gray-400">
                        {/* Display a footer stating this is a system generated barcode plus the generated asset_id */}
                        System generated barcode: <span className="font-mono text-gray-500">{value}</span>
                    </p>
                </div>
            )}
        </div>
    )
}

// Memorize the component to prevent re-render unless props change
export default memo(barcodePreview)
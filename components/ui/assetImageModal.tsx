'use client'

/** 
 * @file components/ui/assetImageModal.tsx
 * @description Modal popup for viewing asset photos captured during AI assessments.
 * 
 * Mirrors the layout and UX of IdCodeModal (backdrop click, Escape key, scroll-lock,
 * responsive card, header style) but loads images directly from a URL instead of
 * fetching from the Supabase IdCodes bucket — since asset photos are stored
 * differently from barcodes/QR codes.
 * 
 * Used by:
 *   - maintenance/page.tsx - Asset condition photos from AI assessments
 * 
 * @example
 *  <AssetImageModal
 *      isOpen={true}
 *      onClose={() => setOpen(false)}
 *      assetId="ICT-LAPTOP-003"
 *      imageUrl="https://..."
 *  />
 */

import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

// -------------------------------------------------------------
//                          Types
// -------------------------------------------------------------
export interface AssetImageModalProps {
    // Whether the modal is currently visible
    isOpen: boolean

    // Callback to close the modal
    onClose: () => void

    // Asset primary key shown in the modal header e.g. "ICT-LAPTOP-003"
    assetId: string

    // Direct URL to the asset photo
    imageUrl: string | undefined
}

// -------------------------------------------------------------
//                         Component
// -------------------------------------------------------------
/**
 * Full-screen modal that displays an asset condition photo.
 * Shares the same UX patterns as IdCodeModal: backdrop click closes,
 * Escape key closes, body scroll is locked while open.
 *
 * @param isOpen   - Controls visibility
 * @param onClose  - Callback when modal should close
 * @param assetId  - Asset ID shown in the header as "Asset Image — {assetId}"
 * @param imageUrl - Direct URL to the asset photo
 */
export default function AssetImageModal({ isOpen, onClose, assetId, imageUrl }: AssetImageModalProps) {

    // ------------------------------------------------------------- 
    //          Use ESCAPE key to close the popup modal
    // -------------------------------------------------------------
    useEffect(() => {
        if (!isOpen) return

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        document.addEventListener('keydown', handleKey)

        return () => document.removeEventListener('keydown', handleKey)

    }, [isOpen, onClose])


    // ------------------------------------------------------------- 
    //     Prevent the body from scrolling while modal is open
    // -------------------------------------------------------------
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''

        return () => { document.body.style.overflow = '' }

    }, [isOpen])


    if (!isOpen) return null


    // ------------------------------------------------------------- 
    //                  Return the modal component
    // -------------------------------------------------------------
    return (
        // Backdrop — clicking outside closes the modal
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-label={`Asset Image for ${assetId}`}
        >
            {/* Modal card — click inside prevents backdrop from closing */}
            <div
                className="bg-white rounded-2xl shadow-2xl
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
                            Asset Image — {assetId}
                        </h2>
                    </div>

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
                                   transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* ------------------- Image area ------------------- */}
                <div className="px-5 py-6 flex items-center justify-center bg-gray-50 min-h-[220px]">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={`Asset ${assetId}`}
                            className="rounded-lg object-contain shadow-sm"
                            style={{ maxWidth: '100%', maxHeight: '50vh' }}
                            onError={() =>
                                console.error('[AssetImageModal] Image failed to load for', assetId)
                            }
                        />
                    ) : (
                        <p className="text-sm text-gray-400">No image available</p>
                    )}
                </div>

            </div>
        </div>
    )
}

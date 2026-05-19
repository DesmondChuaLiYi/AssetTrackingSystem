// components/scanner/SuccessContent.tsx
'use client'

import { Check, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SuccessContent({ 
  scannedCount, 
  scanType,
  item,
  onScanAnother
}: { 
  scannedCount: number 
  scanType: string
  item: any 
  onScanAnother?: () => void
}) {
  const router = useRouter()
  
  const getTitle = () => {
    if (scanType === 'New Asset Registered') {
      return "Asset Registered!"
    }

    if (scanType.startsWith('Tagged to')) {
      return "Asset Tagged!"
    }

    if (scanType === 'Staff Assignment') {
      return "Staff Updated!"
    }

    return "Submission Successful!"
  }

  // Check if this is a Bulk/Staff operation
  const isBulkStaffOperation = scanType === 'Staff Assignment'
  const isBulkLocationOperation = scanType.startsWith('Tagged to')
  const isBulkOperation = isBulkStaffOperation || isBulkLocationOperation

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 lg:p-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <Check className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {getTitle()}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {scanType === 'New Asset Registered' 
              ? `New asset ${item?.name || ''} has been created.`
              : isBulkStaffOperation 
                ? `${item?.name || 'Staff records'} have been successfully updated.`
                : isBulkLocationOperation
                  ? `${item?.name || 'Assets'} have been successfully tagged to ${scanType.includes('Location') ? 'location' : 'department'}.`
                  : `1 ${scanType} item has been successfully submitted.`
            }
          </p>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto text-left">
            <div className="flex items-center justify-center gap-2 text-green-800 mb-4">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold text-lg">
                Confirmation Details
              </span>
            </div>

            {/* CASE 1: Single Asset (Show Full Details) */}
            {item && !isBulkOperation && (
              <div className="text-sm text-green-700 space-y-2">
                <p><strong>Asset ID:</strong> <span className="font-mono">{item.asset_id || item.code}</span></p>
                <p><strong>Name:</strong> {item.name || 'N/A'}</p>
                <p><strong>Category:</strong> {item.category || 'N/A'}</p>
                <p><strong>Model:</strong> {item.model || 'N/A'}</p>
                <p><strong>Condition:</strong> {item.condition || 'N/A'}</p>
                
                {/* Only show Location if it exists */}
                {item.location_id && (
                   <p><strong>Location:</strong> {item.location_id}</p>
                )}
                
                {/* Only show Department if it exists */}
                {item.department_id && (
                   <p><strong>Department:</strong> {item.department_id}</p>
                )}
              </div>
            )}

            {/* CASE 2: Staff / Location / Department bulk (Show summary) */}
            {isBulkOperation && (
               <div className="text-sm text-green-700 space-y-2 text-center">
                  <p className="text-lg font-bold">
                    {isBulkStaffOperation
                      ? `${item?.name || 'Staff records'} Updated`
                      : isBulkLocationOperation
                        ? `${item?.name || 'Assets tagged'} to ${scanType.includes('Location') ? 'Location' : 'Department'}`
                        : 'Multi tagging completed'
                    }
                  </p>
               </div>
            )}

            {/* CASE 3: Fallback */}
            {!item && !isBulkOperation && (
               <div className="text-sm text-green-700 space-y-2 text-center">
                 <p>Total Items: <span className="font-bold">{scannedCount}</span></p>
                 <p>Status: <span className="font-bold">Confirmed</span></p>
               </div>
            )}

             <div className="border-t border-green-200 mt-4 pt-4 text-sm text-green-700 space-y-2">
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              // onClick={() => router.push('/user/scanner')}
              onClick={onScanAnother}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
            >
              Scan More Items
            </button>
            <button
              onClick={() => router.push('/user/dashboard')}
              className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
            >
              View All Submissions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// components/scanner/SuccessContent.tsx
import { Check, CheckCircle } from 'lucide-react';

// --- NEW: Helper component for displaying details ---
const DetailRow = ({ label, value, isMono = false }: { label: string, value: string | null, isMono?: boolean }) => (
  <div className="grid grid-cols-2 gap-2">
    <p className="font-medium text-green-800">{label}:</p>
    <p className={isMono ? 'font-mono' : ''}>{value || 'N/A'}</p>
  </div>
);

// --- MODIFIED: Props are new ---
export default function SuccessContent({ 
  item, 
  pageType, 
  configs 
}: { 
  item: any; 
  pageType: string; 
  configs: any; 
}) {
  
  // Re-create the scanType logic
  let scanType = pageType; // e.g., "New Asset Registered"
  if (pageType.startsWith('Tagged to')) {
    scanType = pageType;
  } else if (configs[pageType]) {
    scanType = configs[pageType].title.split(" ")[0]; // e.g., "Asset"
  }
  
  const scannedCount = 1; // It's always 1

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 lg:p-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 animate-bounce">
            <Check className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Submission Successful!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {scannedCount} {scanType}{" "}
            {scannedCount === 1 ? "item has" : "items have"} been
            successfully submitted.
          </p>

          {/* --- MODIFIED: Show all item details --- */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto text-left">
            <div className="flex items-center justify-center gap-2 text-green-800 mb-4">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold text-lg">
                Confirmation Details
              </span>
            </div>
            <div className="text-sm text-green-700 space-y-2">
              <DetailRow label="Asset ID" value={item.asset_id} isMono={true} />
              <DetailRow label="Name" value={item.name} />
              <DetailRow label="Category" value={item.category} />
              <DetailRow label="Model" value={item.model} />
              <DetailRow label="Status" value={item.status} />
              <DetailRow label="Location" value={item.location_id} />
              <DetailRow label="Department" value={item.department_id} />
            </div>
          </div>
          {/* --- END MODIFICATION --- */}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
            >
              Scan More Items
            </button>
            <button
              // You might want to change this to go to a dashboard
              onClick={() => window.history.back()} 
              className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
            >
              View All Submissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
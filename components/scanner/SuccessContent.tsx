// components/scanner/SuccessContent.tsx
import { Check, CheckCircle } from 'lucide-react';

export default function SuccessContent({ scannedCount, scanType }: { scannedCount: number; scanType: string }) {
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

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold text-lg">
                Confirmation Details
              </span>
            </div>
            <div className="text-sm text-green-700 space-y-2 mt-4">
              <p>Total Items: <span className="font-bold">{scannedCount}</span></p>
              <p>Condition: <span className="font-bold">Confirmed</span></p>
              <p>Date: <span className="font-bold">{new Date().toLocaleDateString()}</span></p>
              <p>Time: <span className="font-bold">{new Date().toLocaleTimeString()}</span></p>
              <p>Department: </p>
              <p>Location: </p>
              Name
              condition
              id
              
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
            >
              Scan More Items
            </button>
            <button
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
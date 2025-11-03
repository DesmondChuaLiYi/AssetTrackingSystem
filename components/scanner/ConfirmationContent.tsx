'use client';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Make sure path is correct
import {
  ChevronLeft,
  CheckCircle,
  Edit,
  AlertCircle,
  Save, // New Icon
  PackagePlus, // New Icon
} from "lucide-react";

// Define the Asset type
type Asset = {
  asset_id: string;
  name: string;
  description: string;
  location_id: string;
  status: string;
};

export default function ConfirmationContent({
  item,
  tableName,
  onBack,
  onSubmit,
  onCreate, // <-- NEW PROP for creating a new asset
}: {
  item: any;
  tableName: string;
  onBack: () => void;
  onSubmit: (status: string) => Promise<void>;
  onCreate: (data: { name: string, description: string, status: string }) => Promise<void>; // <-- NEW PROP
}) {
  // 'loading', 'editing' (found), 'registering' (not found), or 'error'
  const [mode, setMode] = useState<'loading' | 'editing' | 'registering' | 'error'>('loading');
  
  // State for EXISTING asset
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  
  // State for NEW asset form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  // Shared state for status
  const [status, setStatus] = useState("in use");
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: "in use", label: "In-use" },
    { value: "spoiled", label: "Spoiled" },
    { value: "in store", label: "In-store" },
  ];

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!item || !item.code || tableName !== "asset") {
        setMode('error');
        setError("Invalid asset data provided.");
        return;
      }
      
      setMode('loading');
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select()
          .eq("asset_id", item.code)
          .single();

        // This is the "Not Found" case
        if (error && error.code === 'PGRST116') {
          setMode('registering'); // Switch to register mode
          setStatus('in use'); // Set default status
        } 
        // This is any other unexpected error
        else if (error) {
          throw error;
        }
        // This is the "Found" case
        else if (data) {
          setAssetDetails(data as Asset);
          setStatus(data.status || "in use");
          setMode('editing'); // Switch to edit mode
        }

      } catch (err: any) {
        setMode('error');
        setError(err.message || "An unknown error occurred.");
        console.error(err);
      }
    };

    fetchAssetDetails();
  }, [item, tableName]);

  // Handle the form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'editing') {
      onSubmit(status); // Call the update function
    } else if (mode === 'registering') {
      if (!newName) {
        alert("Asset Name is required.");
        return;
      }
      // Call the new create function
      onCreate({ name: newName, description: newDescription, status });
    }
  };

  // Helper to render the status selector
  const renderStatusSelector = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
        {mode === 'editing' ? 'Update Status' : 'Set Initial Condition'}
      </h3>
      <div className="flex flex-col sm:flex-row gap-4">
        {statusOptions.map((option) => (
          <label
            key={option.value}
            className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              status === option.value
                ? "border-red-600 bg-red-50 shadow-md"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={status === option.value}
              onChange={() => setStatus(option.value)}
              className="sr-only"
            />
            <span className="text-lg font-medium text-gray-800">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
  
  // Helper to render the correct form content
  const renderFormContent = () => {
    if (mode === 'loading') {
      return <div className="p-8 text-center">Searching for asset...</div>;
    }

    if (mode === 'error') {
      return (
        <div className="p-8">
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
              <strong className="flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" /> Error
              </strong>
              <p>{error}</p>
            </div>
        </div>
      );
    }
    
    if (mode === 'editing') {
      return (
        <div className="p-6 lg:p-8 space-y-6">
          {/* Asset Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asset Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg text-gray-800">{assetDetails?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Asset ID</label>
                <p className="text-lg text-gray-800 font-mono">{assetDetails?.asset_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-lg text-gray-800">{assetDetails?.description || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Current Location</label>
                <p className="text-lg text-gray-800">{assetDetails?.location_id || 'N/A'}</p>
              </div>
            </div>
          </div>
          {/* Status Selector */}
          {renderStatusSelector()}
        </div>
      );
    }
    
    if (mode === 'registering') {
      return (
         <div className="p-6 lg:p-8 space-y-6">
           <div className="p-4 bg-blue-50 border border-blue-300 text-blue-800 rounded-lg text-center">
              <strong className="flex items-center justify-center gap-2">
                <PackagePlus className="w-5 h-5" />
                New Asset
              </strong>
              <p>This Asset ID was not found. Please register it.</p>
           </div>
           
           {/* New Asset Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Register New Asset</h3>
              <div>
                <label className="text-sm font-medium text-gray-500">Asset ID</label>
                <p className="text-lg text-gray-800 font-mono p-2 bg-gray-100 rounded">{item?.code}</p>
              </div>
              <div>
                <label htmlFor="assetName" className="text-sm font-medium text-gray-700">Asset Name (Required)</label>
                <input 
                  id="assetName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg mt-1"
                  placeholder="e.g., Dell Latitude 5420"
                />
              </div>
              <div>
                <label htmlFor="assetDesc" className="text-sm font-medium text-gray-700">Description</label>
                <textarea 
                  id="assetDesc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg mt-1"
                  rows={3}
                  placeholder="e.g., 14-inch laptop, 16GB RAM, 512GB SSD"
                />
              </div>
            </div>
            
            {/* Status Selector */}
           {renderStatusSelector()}
         </div>
      );
    }
    
    return null; // Should not be reachable
  };
  
  // Get button text based on mode
  const getSubmitButton = () => {
    if (mode === 'editing') {
      return (
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md bg-green-600 text-white hover:bg-green-700"
        >
          <CheckCircle className="w-5 h-5" />
          Submit Status
        </button>
      );
    }
    if (mode === 'registering') {
      return (
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save className="w-5 h-5" />
          Register New Asset
        </button>
      );
    }
    // Render a disabled button for other states
    return (
       <button
          type="submit"
          disabled
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md bg-gray-300 text-gray-500 cursor-not-allowed"
        >
          Submit
        </button>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
              <div className="flex items-center gap-3">
                <Edit className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">
                    {mode === 'registering' ? 'Register Asset' : 'Confirm Asset Status'}
                  </h1>
                  <p className="text-sm text-red-100">Scanned Code: {item?.code}</p>
                </div>
              </div>
            </div>
            {/* RENDER THE CORRECT FORM CONTENT */}
            {renderFormContent()}
          </div>
          
          {/* Footer Buttons */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-4 lg:px-6 py-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back to Scan
                </button>
                
                {/* RENDER THE CORRECT SUBMIT BUTTON */}
                {getSubmitButton()}

              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
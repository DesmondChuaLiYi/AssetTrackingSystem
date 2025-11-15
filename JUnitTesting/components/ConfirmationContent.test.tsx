'use client';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import {
  ChevronLeft,
  CheckCircle,
  Edit,
  AlertCircle,
  Save,
  PackagePlus,
  MapPin, 
  Building2, 
} from "lucide-react";

// (Types are unchanged)
type Asset = {
  asset_id: string; name: string; description: string;
  location_id: string; department_id: string;
  condition: string; category: string; model: string;
};
type Location = { location_id: string; name: string; };
type Department = { department_id: string; name: string; };

export default function ConfirmationContent({
  item,
  tableName,
  onBack,
  onSubmit,
  onCreate,
  parentScan, // <-- ADD THIS PROP
}: {
  item: any;
  tableName: string;
  onBack: () => void;
  onSubmit: (data: {
    condition: string, 
    location_id: string | null,
    department_id: string | null,
    name: string, category: string, model: string, asset_id: string
  }) => Promise<void>; 
  onCreate: (data: { 
    name: string, description: string, condition: string,
    location_id: string | null, department_id: string | null,
    category: string, model: string
  }) => Promise<void>;
  parentScan: { type: string, id: string, name: string } | null; // <-- ADD THIS PROP
}) {
  const [mode, setMode] = useState<'loading' | 'editing' | 'registering' | 'error'>('loading');
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [condition, setCondition] = useState("in use");
  const [newCategory, setNewCategory] = useState('');
  const [newModel, setNewModel] = useState('');
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState(''); 
  const [selectedDepartment, setSelectedDepartment] = useState(''); 
  
  const [error, setError] = useState<string | null>(null);

  const conditionOptions = [
    { value: "in use", label: "In Use" },
    { value: "broken", label: "Broken" },
    { value: "in store", label: "In Store" },
  ];

  useEffect(() => {
    // (This useEffect is unchanged)
    const fetchDropdownData = async () => {
      try {
        const { data: locData, error: locError } = await supabase
          .from('location')
          .select('location_id, name');
        if (locError) throw locError;
        setLocations(locData || []);

        const { data: deptData, error: deptError } = await supabase
          .from('department')
          .select('department_id, name');
        if (deptError) throw deptError;
        setDepartments(deptData || []);

      } catch (err: any) {
        console.error("Error fetching dropdown data:", err);
      }
    };
    
    const fetchAssetDetails = async () => {
      if (!item || !item.code || tableName !== "asset") {
        setMode('error');
        setError("Invalid asset data provided.");
        return;
      }
      
      setMode('loading');
      setError(null);
      await fetchDropdownData(); 
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select()
          .eq("asset_id", item.code)
          .single();

        if (error && error.code === 'PGRST116') {
          setMode('registering'); 
          setCondition('in use'); 
        } 
        else if (error) {
          throw error;
        }
        else if (data) {
          setAssetDetails(data as Asset);
          setCondition(data.condition || "in use");
          setSelectedLocation(data.location_id || '');
          setSelectedDepartment(data.department_id || '');
          setMode('editing');
        }

      } catch (err: any) {
        setMode('error');
        setError(err.message || "An unknown error occurred.");
      }
    };

    fetchAssetDetails();
  }, [item, tableName]);

  const handleSubmit = (e: React.FormEvent) => {
    // (This handleSubmit is unchanged)
    e.preventDefault();
    if (mode === 'editing') {
      onSubmit({
        condition,
        location_id: selectedLocation || null,
        department_id: selectedDepartment || null,
        name: assetDetails?.name || 'N/A', 
        category: assetDetails?.category || 'N/A',
        model: assetDetails?.model || 'N/A',
        asset_id: assetDetails?.asset_id || item.code
      });
    } else if (mode === 'registering') {
      if (!newName || !newCategory || !newModel) {
        alert("Please fill in all required fields: Asset Name, Category, and Model.");
        return;
      }
      onCreate({ 
        name: newName, 
        description: newDescription, 
        condition,
        location_id: selectedLocation || null, 
        department_id: selectedDepartment || null,
        category: newCategory,
        model: newModel
      });
    }
  };

  // --- THIS IS THE FIX for Issue 2 ---
  // This function now hides dropdowns based on parentScan
  const renderDropdownSelectors = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Only show Location dropdown if we are NOT in a Location Scan flow */}
      {(!parentScan || parentScan.type !== 'location') && (
        <div>
          <label htmlFor="assetLocation" className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Location (Optional)
          </label>
          <select 
            id="assetLocation"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">-- None --</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Only show Department dropdown if we are NOT in a Department Scan flow */}
      {(!parentScan || parentScan.type !== 'department') && (
        <div>
          <label htmlFor="assetDept" className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Building2 className="w-4 h-4" /> Department (Optional)
          </label>
          <select 
            id="assetDept"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">-- None --</option>
            {departments.map((dept) => (
              <option key={dept.department_id} value={dept.department_id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  // (renderConditionSelector is unchanged)
  const renderConditionSelector = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
        {mode === 'editing' ? 'Update Condition' : 'Set Initial Condition'}
      </h3>
      <div className="flex flex-col sm:flex-row gap-4">
        {conditionOptions.map((option) => (
          <label
            key={option.value}
            className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              condition === option.value
                ? "border-red-600 bg-red-50 shadow-md"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="condition"
              value={option.value}
              checked={condition === option.value}
              onChange={() => setCondition(option.value)}
              className="sr-only"
            />
            <span className="text-lg font-medium text-gray-800">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
  
  // (renderFormContent is unchanged)
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
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-lg text-gray-800">{assetDetails?.category || 'N/A'}</p>
              </div>
               <div>
                <label className="text-sm font-medium text-gray-500">Model</label>
                <p className="text-lg text-gray-800">{assetDetails?.model || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Update Association</h3>
             {renderDropdownSelectors()}
          </div>
         
          {renderConditionSelector()} 
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assetCategory" className="text-sm font-medium text-gray-700">Category (Required)</label>
                  <input 
                    id="assetCategory"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg mt-1"
                    placeholder="e.g., Laptop, Furniture"
                  />
                </div>
                <div>
                  <label htmlFor="assetModel" className="text-sm font-medium text-gray-700">Model (Required)</label>
                  <input 
                    id="assetModel"
                    type="text"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-lg mt-1"
                    placeholder="e.g., Latitude 5420, Moma Water"
                  />
                </div>
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

              {renderDropdownSelectors()}
            </div>
            
           {renderConditionSelector()}
         </div>
      );
    }
    
    return null;
  };
  
  // (getSubmitButton is unchanged)
  const getSubmitButton = () => {
    if (mode === 'editing') {
      return (
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md bg-green-600 text-white hover:bg-green-700"
        >
          <CheckCircle className="w-5 h-5" />
          Submit Changes
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

  // (Return wrapper is unchanged)
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
                    {mode === 'registering' ? 'Register Asset' : 'Confirm Asset'}
                  </h1>
                  <p className="text-sm text-red-100">Scanned Code: {item?.code}</p>
                </div>
              </div>
            </div>
            {renderFormContent()}
          </div>
          
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
                {getSubmitButton()}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
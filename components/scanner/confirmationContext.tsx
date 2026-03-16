'use client';
import React, { useState, useEffect, useRef } from "react";
import { Database } from '@/lib/supabase/types';
import { supabase } from "@/lib/supabase/client";
import {
  ChevronLeft,
  CheckCircle,
  Edit,
  AlertCircle,
  Save,
  PackagePlus,
  MapPin,
  Building2,
  SlidersHorizontal,
  Cpu,
} from "lucide-react";

type Asset = {
  asset_id: string; name: string; description: string;
  location_id: string; department_id: string;
  condition: string; category: string; model: string;
};
type Department = Database['public']['Tables']['Department']['Row'];
type Location = Database['public']['Tables']['Location']['Row'];

export default function ConfirmationContent({
  item,
  tableName,
  onBack,
  onSubmit,
  onCreate,
  parentScan,
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
  parentScan: { type: string, id: string, name: string } | null;
}) {
  const [mode, setMode] = useState<'loading' | 'editing' | 'registering' | 'error'>('loading');
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);

  // Two-step flow for editing mode
  const [pageStep, setPageStep] = useState<'confirm' | 'update'>('confirm');
  const [conditionMethod, setConditionMethod] = useState<null | 'manual' | 'ai'>(null);

  // Registering fields
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newModel, setNewModel] = useState('');

  const [condition, setCondition] = useState("In-use");
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Manual update fields
  const [maintenanceNeeded, setMaintenanceNeeded] = useState<boolean>(false);
  const [priority, setPriority] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [feedback, setFeedback] = useState('');

  // Camera / AI states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [pendingCameraMode, setPendingCameraMode] = useState<'user' | 'environment' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const conditionOptions = [
    { value: "In-use", label: "In-use" },
    { value: "Spoiled", label: "Spoiled" },
    { value: "In-store", label: "In-store" },
  ];

  // Camera effects
  useEffect(() => {
    if (pendingCameraMode && videoRef.current) {
      initializeCamera(pendingCameraMode);
      setPendingCameraMode(null);
    }
  }, [pendingCameraMode, showCamera]);

  const initializeCamera = async (mode: 'user' | 'environment') => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setFacingMode(mode);
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const startCamera = (mode: 'user' | 'environment' = 'environment') => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setShowCamera(true);
    setPendingCameraMode(mode);
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImageFile(file);
            setImagePreview(canvas.toDataURL('image/jpeg'));
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Data fetching
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: locData } = await supabase.from('Location').select('*');
        setLocations(locData || []);
        const { data: deptData } = await supabase.from('Department').select('*');
        setDepartments(deptData || []);
      } catch (err: any) {
        console.error("Error fetching dropdown data:", err);
      }
    };

    const fetchAssetDetails = async () => {
      if (!item || !item.code) {
        setMode('error');
        setError("Invalid asset data provided.");
        return;
      }
      setMode('loading');
      setError(null);
      await fetchDropdownData();

      try {
        const { data, error } = await supabase
          .from(tableName as "Asset" | "Location" | "Department" | "Staff" | "StaffAsset" | "Sessions" | "Maintenance")
          .select()
          .eq("asset_id", item.code)
          .single();

        if (error && error.code === 'PGRST116') {
          setMode('registering');
          setCondition('In-use');
        } else if (error) {
          throw error;
        } else if (data) {
          const typedData = data as Asset;
          setAssetDetails(typedData);
          setCondition(typedData.condition || "In-use");
          setSelectedLocation(typedData.location_id || '');
          setSelectedDepartment(typedData.department_id || '');
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

  // ── Helpers ──────────────────────────────────────────────
  const getConditionBadge = (cond: string) => {
    const base = "px-3 py-1 rounded-full text-sm font-bold";
    if (cond === 'In-use') return `${base} bg-green-100 text-green-800 border border-green-300`;
    if (cond === 'Spoiled') return `${base} bg-red-100 text-red-800 border border-red-300`;
    return `${base} bg-yellow-100 text-yellow-800 border border-yellow-300`;
  };

  // ── STEP 1: Confirm — read-only details ──────────────────
  const renderConfirmStep = () => {
    const locationName = locations.find(l => l.location_id === assetDetails?.location_id)?.name
      || assetDetails?.location_id || '—';
    const deptName = departments.find(d => d.department_id === assetDetails?.department_id)?.name
      || assetDetails?.department_id || '—';

    return (
      <div className="p-6 lg:p-8 space-y-6">
        {/* Asset Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asset Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-base text-gray-800 mt-0.5">{assetDetails?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Asset ID</p>
              <p className="text-base text-gray-800 font-mono mt-0.5">{assetDetails?.asset_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="text-base text-gray-800 mt-0.5">{assetDetails?.category || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Model</p>
              <p className="text-base text-gray-800 mt-0.5">{assetDetails?.model || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Location Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="text-base text-gray-800 mt-0.5">{locationName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="text-base text-gray-800 mt-0.5">{deptName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Condition */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Current Condition:</span>
          <span className={getConditionBadge(assetDetails?.condition || 'In-use')}>
            {assetDetails?.condition || 'In-use'}
          </span>
        </div>
      </div>
    );
  };

  // ── STEP 2: Update — condition selector ──────────────────
  const renderUpdateStep = () => (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Asset summary pill */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">{assetDetails?.name}</p>
          <p className="text-xs font-mono text-gray-500">{assetDetails?.asset_id}</p>
        </div>
        <span className={getConditionBadge(condition)}>{condition}</span>
      </div>

      {/* ── Location update ── */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Update Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 text-gray-800 bg-white mt-1"
            >
              <option value="">-- None --</option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Building2 className="w-4 h-4" /> Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 text-gray-800 bg-white mt-1"
            >
              <option value="">-- None --</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Asset Condition section ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asset Condition</h3>

        {/* Method toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConditionMethod('manual')}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
              conditionMethod === 'manual'
                ? 'border-red-600 bg-red-600 text-white shadow-md'
                : 'border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 bg-white'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            Manual
          </button>
          <button
            type="button"
            onClick={() => {
              setConditionMethod('ai');
              setImageFile(null);
              setImagePreview('');
              stopCamera();
            }}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
              conditionMethod === 'ai'
                ? 'border-red-600 bg-red-600 text-white shadow-md'
                : 'border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 bg-white'
            }`}
          >
            <Cpu className="w-5 h-5" />
            AI Assessment
          </button>
        </div>

        {/* ── MANUAL fields ── */}
        {conditionMethod === 'manual' && (
          <div className="space-y-5 border-2 border-gray-100 rounded-lg p-4 bg-gray-50">

            {/* Photo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Photo (Optional)</label>

              {!imageFile && !showCamera && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </button>

                  <p className="text-center text-gray-400 text-sm font-medium">OR</p>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-red-400 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="manual-image-upload"
                    />
                    <label htmlFor="manual-image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <svg className="w-9 h-9 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm text-gray-600"><span className="font-semibold text-red-600">Click to upload</span></span>
                      <span className="text-xs text-gray-400">JPEG, JPG, PNG or WebP (max 10MB)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Camera view */}
              {showCamera && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto object-contain"
                      style={{ minHeight: '250px', maxHeight: '400px', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                      className="absolute top-3 right-3 bg-white bg-opacity-80 p-2 rounded-full shadow-lg hover:bg-opacity-100 transition-all"
                      title="Switch Camera"
                    >
                      <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {/* Image preview */}
              {imageFile && imagePreview && (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">{(imageFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(''); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Asset Condition */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Asset Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 text-gray-800 bg-white"
              >
                {conditionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Maintenance Needed */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Maintenance Needed</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setMaintenanceNeeded(opt.value)}
                    className={`py-3 rounded-lg border-2 font-medium transition-all ${
                      maintenanceNeeded === opt.value
                        ? 'border-red-600 bg-red-600 text-white shadow-md'
                        : 'border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Low', value: 'low', color: 'bg-yellow-400' },
                  { label: 'Medium', value: 'medium', color: 'bg-orange-500' },
                  { label: 'High', value: 'high', color: 'bg-red-600' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value as 'low' | 'medium' | 'high')}
                    className={`py-3 rounded-lg border-2 font-medium transition-all ${
                      priority === opt.value
                        ? `${opt.color} border-transparent text-white shadow-md`
                        : 'border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 bg-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Add notes or remarks about this asset..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 text-gray-800 bg-white resize-none"
              />
            </div>
          </div>
        )}

        {/* ── AI ── */}
        {conditionMethod === 'ai' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Take or upload a photo — AI will assess the asset condition.
            </p>

            {/* Choose camera or upload */}
            {!imageFile && !showCamera && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Open Camera
                </button>

                <p className="text-center text-gray-400 text-sm font-medium">OR</p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    id="ai-image-upload"
                  />
                  <label htmlFor="ai-image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-red-600">Click to upload</span>
                    </span>
                    <span className="text-xs text-gray-400">JPEG, JPG, PNG or WebP (max 10MB)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Camera view */}
            {showCamera && (
              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto object-contain"
                    style={{ minHeight: '250px', maxHeight: '400px', display: 'block' }}
                  />
                  {/* Switch camera */}
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                    className="absolute top-3 right-3 bg-white bg-opacity-80 p-2 rounded-full shadow-lg hover:bg-opacity-100 transition-all"
                    title="Switch Camera"
                  >
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  {/* Camera indicator */}
                  <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {/* Image preview */}
            {imageFile && imagePreview && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={imagePreview} alt="Preview" className="w-full h-52 object-contain" />
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{imageFile.name}</p>
                      <p className="text-xs text-gray-500">{(imageFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(''); }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── Registering mode (unchanged) ─────────────────────────
  const renderDropdownSelectors = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}
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
              <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const renderRegisteringContent = () => (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-300 text-blue-800 rounded-lg text-center">
        <strong className="flex items-center justify-center gap-2">
          <PackagePlus className="w-5 h-5" /> New Asset
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
          <input id="assetName" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required
            className="w-full p-2 border border-gray-300 rounded-lg mt-1" placeholder="e.g., Dell Latitude 5420" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="assetCategory" className="text-sm font-medium text-gray-700">Category (Required)</label>
            <input id="assetCategory" type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required
              className="w-full p-2 border border-gray-300 rounded-lg mt-1" placeholder="e.g., Laptop, Furniture" />
          </div>
          <div>
            <label htmlFor="assetModel" className="text-sm font-medium text-gray-700">Model (Required)</label>
            <input id="assetModel" type="text" value={newModel} onChange={(e) => setNewModel(e.target.value)} required
              className="w-full p-2 border border-gray-300 rounded-lg mt-1" placeholder="e.g., Latitude 5420" />
          </div>
        </div>
        <div>
          <label htmlFor="assetDesc" className="text-sm font-medium text-gray-700">Description</label>
          <textarea id="assetDesc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mt-1" rows={3} placeholder="e.g., 14-inch laptop, 16GB RAM" />
        </div>
        {renderDropdownSelectors()}
      </div>
      {/* Condition selector for registering */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Set Initial Condition</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          {conditionOptions.map((option) => (
            <label key={option.value}
              className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                condition === option.value ? "border-red-600 bg-red-50 shadow-md" : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input type="radio" name="condition" value={option.value} checked={condition === option.value}
                onChange={() => setCondition(option.value)} className="sr-only" />
              <span className="text-lg font-medium text-gray-800">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main form content dispatcher ─────────────────────────
  const renderFormContent = () => {
    if (mode === 'loading') return <div className="p-8 text-center text-gray-500">Searching for asset...</div>;

    if (mode === 'error') return (
      <div className="p-8">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
          <strong className="flex items-center justify-center gap-2"><AlertCircle className="w-5 h-5" /> Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );

    if (mode === 'editing') {
      return pageStep === 'confirm' ? renderConfirmStep() : renderUpdateStep();
    }

    if (mode === 'registering') return renderRegisteringContent();

    return null;
  };

  // ── Header title ─────────────────────────────────────────
  const getHeaderTitle = () => {
    if (mode === 'registering') return 'Register Asset';
    if (mode === 'editing' && pageStep === 'update') return 'Update Asset';
    return 'Confirm Asset';
  };

  // ── Bottom action buttons ─────────────────────────────────
  const renderButtons = () => {
    // Loading / error — just back
    if (mode === 'loading' || mode === 'error') {
      return (
        <button type="button" onClick={onBack}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
          <ChevronLeft className="w-5 h-5" /> Back to Scan
        </button>
      );
    }

    // Editing — step 1
    if (mode === 'editing' && pageStep === 'confirm') {
      return (
        <>
          <button type="button" onClick={onBack}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <button type="button" onClick={() => setPageStep('update')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md">
            <Edit className="w-5 h-5" /> Update Asset
          </button>
        </>
      );
    }

    // Editing — step 2
    if (mode === 'editing' && pageStep === 'update') {
      const canSubmit = conditionMethod === 'manual' || (conditionMethod === 'ai' && !!imageFile);
      return (
        <>
          <button type="button" onClick={() => { setPageStep('confirm'); setConditionMethod(null); stopCamera(); setImageFile(null); setImagePreview(''); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <button type="submit" disabled={!canSubmit}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
              canSubmit ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}>
            <CheckCircle className="w-5 h-5" /> Update Asset
          </button>
        </>
      );
    }

    // Registering
    if (mode === 'registering') {
      return (
        <>
          <button type="button" onClick={onBack}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
            <ChevronLeft className="w-5 h-5" /> Back to Scan
          </button>
          <button type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md">
            <Save className="w-5 h-5" /> Register New Asset
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
              <div className="flex items-center gap-3">
                <Edit className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">{getHeaderTitle()}</h1>
                  <p className="text-sm text-red-100">Scanned Code: {item?.code}</p>
                </div>
              </div>
            </div>
            {renderFormContent()}
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <div className="px-4 lg:px-6 py-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {renderButtons()}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

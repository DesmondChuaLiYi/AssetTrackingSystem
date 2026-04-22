// This is just a testing page!, will remove after successsful merge into main branch (WC)

'use client';
import SuccessContent from '@/components/scanner/successContent';
import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, Barcode, ChevronLeft, Sparkles, PenLine,
  Upload, CheckCircle, RefreshCw, MapPin, Building2, Edit, XCircle,
} from 'lucide-react';
import type { AiAssessmentResult } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type ConditionStatus = 'In-use' | 'In-store' | 'Spoiled';
type PriorityLevel = 'none' | 'low' | 'medium' | 'high';
type Department = Database['public']['Tables']['Department']['Row'];
type Location = Database['public']['Tables']['Location']['Row'];

type ScannedAsset = {
  id: string; name: string; category: string;
  model: string; condition: string;
  location_id: string; department_id: string;
};

type ManualSubmitData = {
  condition_status: ConditionStatus;
  maintenance_needed: boolean;
  priority: PriorityLevel;
  feedback: string | null;
  ai_response: string | null;
  image_url: string | null;
  image_file: File | null;
  approval_status: 'pending';
};

type AiSubmitData = {
  condition_status: ConditionStatus;
  maintenance_needed: boolean;
  priority: PriorityLevel;
  feedback: null;
  ai_response: string;
  image_url: string | null;
  image_file: File | null;
  approval_status: 'pending';
};

const conditionOptions: ConditionStatus[] = ['In-use', 'In-store', 'Spoiled'];

// Limit feedback to 50 words and basic punctuation for manaul and AI input
const FEEDBACK_MAX_WORDS = 50;
function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}
function sanitizeFeedback(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\s.,!?;:()\-'"]/g, '');
}
function truncateToWords(text: string | null | undefined, maxWords: number): string {
  if (!text) return '';
  return text.trim().split(/\s+/).slice(0, maxWords).join(' ');
}

// Condition badge
function conditionBadge(cond: string) {
  if (cond === 'In-use')  return 'px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-300';
  if (cond === 'Spoiled') return 'px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border border-red-300';
  return 'px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800 border border-yellow-300';
}

// ── Step 1: Scan Asset (real Html5Qrcode scanner + manual fallback) ────────────
const SCANNER_REGION_ID = 'asset-qr-reader';

function ScanAssetStep({ onAssetScanned }: {
  onAssetScanned: (asset: ScannedAsset) => void;
}) {
  // Scanner state
  const [isScanning,    setIsScanning]    = useState(false);
  const [scannerError,  setScannerError]  = useState<string | null>(null);
  const scannerRef          = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef  = useRef<string | null>(null);
  const lastScannedTimeRef  = useRef<number>(0);

  // Lookup state (used by both QR decode and manual input)
  const [manualCode, setManualCode] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Safe scanner teardown ────────────────────────────────────
  const safeStopAndClear = async (inst: Html5Qrcode | null) => {
    if (!inst) return;
    try {
      const state = await (inst as any).getState();
      if (state === 2) await (inst as any).stop();
    } catch {
      try { await (inst as any).stop(); } catch { /* silent */ }
    }
    try { (inst as any).clear(); } catch { /* silent */ }
  };

  // ── Supabase lookup — shared by QR decode & manual input ────
  const lookupAsset = async (code: string) => {
    setLoading(true); setError(null);
    try {
        const params = new URLSearchParams({ table: 'Asset', idColumn: 'asset_id', scannedCode: code.trim() });
        const res = await fetch(`/api/scanner?${params}`);
        const result = await res.json();
        if (!result.success || !result.data) {
          setError(`Asset "${code.trim()}" not found in database.`);
        }
        else {
          onAssetScanned({
            id: result.data.asset_id,
            name: result.data.name,
            category: result.data.category,
            model: result.data.model,
            condition: result.data.condition,
            location_id: result.data.location_id   || '',
            department_id: result.data.department_id || '',
          });
        }
      } catch { setError('Failed to fetch asset.'); }
      finally  { setLoading(false); }
    };

  // Start scanner 
  useEffect(() => {
    if (!isScanning) return;
    let isMounted = true;

    const startScanner = async () => {
      if (scannerRef.current) {
        await safeStopAndClear(scannerRef.current);
        scannerRef.current = null;
      }
      if (!isMounted) return;

      try {
        const scanner = new Html5Qrcode(SCANNER_REGION_ID);
        scannerRef.current = scanner;

        await (scanner as any).start(
          { facingMode: 'environment' },
          { fps: 30, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 },
          (decodedText: string) => {
            if (!isMounted) return;

            // Debounce: ignore same code within 2 second
            const now = Date.now();
            if (lastScannedCodeRef.current === decodedText && now - lastScannedTimeRef.current < 2000) return;
            lastScannedCodeRef.current = decodedText;
            lastScannedTimeRef.current = now;

            // Sounds Beep
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77BdGgU+mtn0xG8qBSuBzvLZiTYIGWe77OWfTRAMUKnj7K5iHAY5j9n0xXksBS");
              audio.play().catch(() => {});
            } catch { /* silent */ }

            // Stop scanner then look up asset
            stopScanning();
            lookupAsset(decodedText);
          },
          () => {} 
        );
      } catch (err: any) {
        if (isMounted) {
          setScannerError(err.message || 'Camera access denied.');
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      const inst = scannerRef.current;
      scannerRef.current = null;
      safeStopAndClear(inst);
    };
  }, [isScanning]); 

  const handleStartClick = () => { setScannerError(null); setError(null); setIsScanning(true); };
  const stopScanning     = () => setIsScanning(false);

  const handleManualScan = () => { if (manualCode.trim()) lookupAsset(manualCode); };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
            <div className="flex items-center gap-3">
              <QrCode className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Step 1 — Scan Asset</h1>
                <p className="text-sm text-red-100">Scan the asset QR code or barcode</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scanner area */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6 lg:p-8">

            {/* Idle state — tap to start */}
            {!isScanning && (
              <div
                onClick={handleStartClick}
                className="relative w-full h-64 lg:h-80 border-4 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white hover:border-red-400 transition-all cursor-pointer"
              >
                <QrCode className="w-20 h-20 text-red-600 animate-pulse mb-4" />
                <Barcode className="w-20 h-20 text-black opacity-20 absolute" />
                <p className="text-lg font-medium text-gray-700">Tap to Scan Asset</p>
                <p className="text-sm text-gray-500 mt-2">Position the QR / barcode within the frame</p>
              </div>
            )}

            {/* Live scanner */}
            {isScanning && (
              <div className="w-full text-center">
                <div
                  id={SCANNER_REGION_ID}
                  className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200"
                />
                <button
                  onClick={stopScanning}
                  className="mt-4 flex items-center justify-center gap-2 mx-auto px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                >
                  <XCircle className="w-4 h-4" /> Stop Scanning
                </button>
              </div>
            )}

            {/* Scanner / lookup error */}
            {(scannerError || error) && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
                {scannerError || error}
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="mt-4 text-center text-sm text-gray-500 animate-pulse">
                🔍 Looking up asset...
              </div>
            )}

            {/* Tips */}
            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-red-600" /> Scanning Tips:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-7">
                <li>• Ensure good lighting conditions</li>
                <li>• Hold device steady</li>
                <li>• Keep code centered in frame</li>
              </ul>
            </div>

            {/* Manual fallback */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">⌨️ Enter Asset ID Manually</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManualScan(); }}
                  placeholder="Enter a real asset_id from Supabase"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <button
                  onClick={handleManualScan}
                  disabled={!manualCode.trim() || loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Checking...' : 'Look Up'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Use this if scanning is unavailable on this device.</p>
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 lg:px-6 py-4 bg-gray-50">
            <button
              onClick={() => { if (isScanning) stopScanning(); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Confirm asset details before update
function ConfirmAssetStep({ asset, locations, departments, onConfirm, onBack }: {
  asset: ScannedAsset;
  locations: Location[];
  departments: Department[];
  onConfirm: () => void;
  onBack: () => void;
}) {
  const locationName = locations.find(l => l.location_id === asset.location_id)?.name     || asset.location_id   || '—';
  const departmentName = departments.find(d => d.department_id === asset.department_id)?.name || asset.department_id || '—';

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
            <div className="flex items-center gap-3">
              <Edit className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Confirm Asset</h1>
                <p className="text-sm text-red-100">Scanned Code: {asset.id}</p>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asset Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[['Name', asset.name], ['Asset ID', asset.id], ['Category', asset.category], ['Model', asset.model]].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-base text-gray-800 mt-0.5 font-mono">{value || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>

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
                    <p className="text-base text-gray-800 mt-0.5">{departmentName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">Current Condition:</span>
              <span className={conditionBadge(asset.condition)}>{asset.condition}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 lg:px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button onClick={onBack} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
              <button onClick={onConfirm} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md">
                <Edit className="w-5 h-5" /> Update Asset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Update asset condition
function UpdateAssetStep({ asset, locations, departments, onSubmitManual, onSubmitAI, onBack, isSubmitting }: {
  asset: ScannedAsset;
  locations: Location[];
  departments: Department[];
  onSubmitManual: (data: ManualSubmitData, locationId: string, departmentId: string) => void;
  onSubmitAI: (data: AiSubmitData, locationId: string, departmentId: string) => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Mode toggle
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');

  // Shared image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [pendingCameraMode, setPendingCameraMode] = useState<'user' | 'environment' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const manualErrorRef = useRef<HTMLDivElement>(null);
  const aiErrorRef = useRef<HTMLDivElement>(null);

  // Manual state
  const [condition, setCondition] = useState<ConditionStatus>('In-use');
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [feedback, setFeedback] = useState('');

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAssessmentResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [aiSubmitError, setAiSubmitError] = useState<string | null>(null);

  const priorityColors: Record<PriorityLevel, { bg: string; border: string; text: string }> = {
    high: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
    medium: { bg: '#fff7ed', border: '#fdba74', text: '#ea580c' },
    low: { bg: '#fefce8', border: '#fde047', text: '#ca8a04' },
    none: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  };

  // Camera setup and teardown
  useEffect(() => {
    if (pendingCameraMode && videoRef.current) {
      initializeCamera(pendingCameraMode); setPendingCameraMode(null);
    }
  }, [pendingCameraMode, showCamera]);

  const initializeCamera = async (m: 'user' | 'environment') => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: m, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (videoRef.current) { videoRef.current.srcObject = ms; setStream(ms); setFacingMode(m); }
    } catch (err) { console.error('Camera error:', err); setShowCamera(false); }
  };

  const startCamera = (m: 'user' | 'environment' = 'environment') => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setShowCamera(true); setPendingCameraMode(m);
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current, c = canvasRef.current;
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(v, 0, 0);
        c.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImageFile(file); setImagePreview(c.toDataURL('image/jpeg')); stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) || file.size > 10 * 1024 * 1024) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImageFile(null); setImagePreview(''); stopCamera(); };
  const resetAi = () => { setAiResult(null); setAiError(''); clearImage(); };

  // AI Analysis
  const handleAiAnalyze = async () => {
    if (!imageFile) return;
    if (!selectedLocation) {
      setAiError('Please select a location before analyzing.');
      return;
    }
    if (!selectedDepartment) {
      setAiError('Please select a department before analyzing.');
      return;
    }
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const response = await fetch('/api/assessAsset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, assetId: asset.id, locationId: selectedLocation || asset.location_id, userId: null, mimeType: imageFile.type }),
      });
      const data = await response.json();
      if (data.success) { 
        setAiResult(data.assessment); 
      }
      else 
        { setAiError(data.detail || data.error || 'Assessment failed'); 

        }
    } catch { setAiError('Failed to assess asset. Check console for details.'); }
    finally { setAiLoading(false); }
  };

  // Upload image section (used in both manual and AI modes)
  const renderImageSection = (required = false) => (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        Asset Photo {required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
      </label>
      {!imageFile && !showCamera && (
        <div className="space-y-3">
          <button type="button" onClick={() => startCamera('environment')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Open Camera
          </button>
          <div className="text-center text-gray-400 text-xs">OR</div>
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e5e7eb', borderRadius: 12, padding: '20px', cursor: 'pointer', background: '#fafafa', gap: 8 }}>
            <Upload size={28} color="#9ca3af" />
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Click to upload</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>JPEG, PNG, WebP (max 10MB)</span>
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
        </div>
      )}
      {showCamera && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: 300 }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto object-contain" style={{ minHeight: 300, maxHeight: 500, display: 'block' }} />
            <button type="button" onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')} className="absolute top-4 right-4 bg-white bg-opacity-80 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={capturePhoto} className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Capture Photo
            </button>
            <button type="button" onClick={stopCamera} className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">Cancel</button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {imageFile && imagePreview && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain" />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs text-gray-600">{imageFile.name} • {(imageFile.size / 1024).toFixed(1)} KB</span>
            <button type="button" onClick={clearImage} className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8">

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
          <div className="flex items-center gap-3">
            <Edit className="w-7 h-7" />
            <div>
              <h1 className="text-xl font-bold">Update Asset</h1>
              <p className="text-sm text-red-100 font-mono">Scanned Code: {asset.id}</p>
            </div>
          </div>
        </div>
        {/* Asset summary pill */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-800">{asset.name}</p>
            <p className="text-xs font-mono text-gray-500">{asset.id}</p>
          </div>
          <span className={conditionBadge(asset.condition)}>{asset.condition}</span>
        </div>
      </div>

      {/* Update location*/}
      <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" /> Update Location
          </h2>
          {aiLoading && (
            <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-300 px-2 py-1 rounded-full font-medium">
              🔒 Locked during analysis
            </span>
          )}
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
              <MapPin className="w-4 h-4" /> Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={aiLoading}
              className={`w-full p-3 border-2 rounded-lg focus:outline-none text-gray-800 ${aiLoading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 focus:border-red-500'}`}
            >
              <option value="">-- None --</option>
              {locations.map(loc => (
                <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
              <Building2 className="w-4 h-4" /> Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={aiLoading}
              className={`w-full p-3 border-2 rounded-lg focus:outline-none text-gray-800 ${aiLoading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 focus:border-red-500'}`}
            >
              <option value="">-- None --</option>
              {departments.map(dept => (
                <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top-level validation error banner — covers both manual and AI submit errors */}
      {(manualError || aiSubmitError || aiError) && (
        <div ref={aiErrorRef} className="flex items-center gap-2 p-3 mb-4 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-lg text-sm font-medium">
          ⚠ {manualError || aiSubmitError || aiError}
        </div>
      )}
      {/* Shows Asset Condition */}
      <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Asset Condition</h2>
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
            <button
              onClick={() => { setMode('manual'); setManualError(null); setAiSubmitError(null); setAiError(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: 'none', background: mode === 'manual' ? 'white' : 'transparent', color: mode === 'manual' ? '#111' : '#9ca3af', fontWeight: 600, fontSize: 12, cursor: 'pointer', boxShadow: mode === 'manual' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}
            >
              <PenLine size={13} /> Manual
            </button>
            <button
              onClick={() => { setMode('ai'); resetAi(); setManualError(null); setAiSubmitError(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: 'none', background: mode === 'ai' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent', color: mode === 'ai' ? 'white' : '#9ca3af', fontWeight: 600, fontSize: 12, cursor: 'pointer', boxShadow: mode === 'ai' ? '0 1px 6px rgba(79,70,229,0.3)' : 'none', transition: 'all 0.15s' }}
            >
              <Sparkles size={13} /> AI Assist
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* Manual update asset condition*/}
          {mode === 'manual' && (
            <div className="space-y-5">
              {/* Condition */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Condition Status <span className="text-red-500">*</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {conditionOptions.map(opt => (
                    <label key={opt} style={{ flex: 1, border: `2px solid ${condition === opt ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: condition === opt ? '#fef2f2' : 'white', color: condition === opt ? '#dc2626' : '#374151', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
                      <input type="radio" name="condition" value={opt} checked={condition === opt} onChange={() => setCondition(opt)} style={{ display: 'none' }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              {/* Maintenance */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Maintenance Needed?</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
                    <label key={label} style={{ flex: 1, border: `2px solid ${maintenanceNeeded === val ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: maintenanceNeeded === val ? '#fef2f2' : 'white', color: maintenanceNeeded === val ? '#dc2626' : '#374151', fontWeight: 600, fontSize: 13 }}>
                      <input type="radio" checked={maintenanceNeeded === val} onChange={() => setMaintenanceNeeded(val)} style={{ display: 'none' }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              {maintenanceNeeded && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Priority <span className="text-red-500">*</span></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['low', 'medium', 'high'] as PriorityLevel[]).map(p => (
                      <label key={p} style={{ flex: 1, border: `2px solid ${priority === p ? priorityColors[p].border : '#e5e7eb'}`, borderRadius: 10, padding: '8px', textAlign: 'center', cursor: 'pointer', background: priority === p ? priorityColors[p].bg : 'white', color: priority === p ? priorityColors[p].text : '#374151', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>
                        <input type="radio" checked={priority === p} onChange={() => setPriority(p)} style={{ display: 'none' }} />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback for staff to fill out */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Staff Feedback <span className="text-red-500">*</span></label>
                <textarea
                  value={feedback}
                  onChange={(e) => {
                    const s = sanitizeFeedback(e.target.value);
                    setFeedback(countWords(s) <= FEEDBACK_MAX_WORDS ? s : truncateToWords(s, FEEDBACK_MAX_WORDS));
                    if (s.trim()) setManualError(null);
                  }}
                  rows={3}
                  placeholder="Describe the asset condition e.g. chair leg is loose, screen has cracks..."
                  className={`w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none ${
                    manualError ? 'border-red-500' : countWords(feedback) >= FEEDBACK_MAX_WORDS ? 'border-orange-400' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">Letters, numbers and basic punctuation only</span>
                  <span className={`text-xs font-semibold ${countWords(feedback) >= FEEDBACK_MAX_WORDS ? 'text-orange-500' : 'text-gray-400'}`}>
                    {countWords(feedback)} / {FEEDBACK_MAX_WORDS} words
                  </span>
                </div>
              </div>

              {/*Upload Image*/}
              {renderImageSection(false)}

              {/* Submit the update*/}
              <button
                onClick={() => {
                  setManualError(null);
                  setAiSubmitError(null);
                  if (!selectedLocation) {
                    setManualError('Please select a location before submitting.');
                    setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                    return;
                  }
                  if (!selectedDepartment) {
                    setManualError('Please select a department before submitting.');
                    setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                    return;
                  }
                  if (maintenanceNeeded) {
                    if (priority === 'none') {
                      setManualError('Please select a priority level since maintenance is needed.');
                      setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                      return;
                    }
                    if (!feedback.trim() || countWords(feedback) === 0) {
                      setManualError('Please enter staff feedback before submitting.');
                      setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                      return;
                    }
                    if (!imageFile) {
                      setManualError('Please upload a photo of the asset since maintenance is needed.');
                      setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                      return;
                    }
                  }
                  setManualError(null);
                  onSubmitManual(
                    { condition_status: condition, maintenance_needed: maintenanceNeeded, priority: maintenanceNeeded ? priority : 'none', feedback: truncateToWords(feedback.trim(), FEEDBACK_MAX_WORDS), ai_response: null, image_url: imagePreview || null, image_file: imageFile, approval_status: 'pending' },
                    selectedLocation, selectedDepartment
                  );
                }}
                disabled={isSubmitting}
                className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Submit Manual Assessment'}
              </button>
            </div>
          )}

          {/*AI Assistent */}
          {mode === 'ai' && (
            <div style={{ border: '2px solid #e0e7ff', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="white" />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Gemini AI Assessment</span>
                <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>Auto-analyze</span>
              </div>
              <div style={{ padding: 16, background: '#fafafe' }} className="space-y-4">
                {!aiResult && (
                  <>
                    {renderImageSection(true)}
                    {imageFile && !aiLoading && (
                      <button onClick={handleAiAnalyze} style={{ width: '100%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, padding: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Sparkles size={15} /> Analyze with Gemini
                      </button>
                    )}
                    {aiLoading && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 44, height: 44, border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14 }}>Analyzing asset condition...</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Gemini is reviewing the image</div>
                      </div>
                    )}
                  </>
                )}
                {aiResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: priorityColors[aiResult.priority as PriorityLevel].bg, border: `1.5px solid ${priorityColors[aiResult.priority as PriorityLevel].border}`, borderRadius: 10, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Priority</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: priorityColors[aiResult.priority as PriorityLevel].text, marginTop: 2, textTransform: 'capitalize' }}>{aiResult.priority}</div>
                      </div>
                      <div style={{ background: aiResult.maintenanceNeeded ? '#fff7ed' : '#f0fdf4', border: `1.5px solid ${aiResult.maintenanceNeeded ? '#fdba74' : '#86efac'}`, borderRadius: 10, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Maintenance</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: aiResult.maintenanceNeeded ? '#ea580c' : '#16a34a', marginTop: 2 }}>{aiResult.maintenanceNeeded ? '⚠️ Needed' : '✓ Not needed'}</div>
                      </div>
                    </div>
                    {aiResult.issues?.length > 0 && (
                      <div style={{ background: 'white', border: '1.5px solid #e0e7ff', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 6 }}>Issues Detected</div>
                        {aiResult.issues.map((issue, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 6, marginBottom: 3 }}>
                            <span style={{ color: '#4f46e5' }}>•</span> {issue}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>AI Summary</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>{truncateToWords(aiResult.fullResponse ?? '', FEEDBACK_MAX_WORDS)}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setManualError(null);
                          setAiSubmitError(null);
                          if (!selectedLocation) {
                            setAiSubmitError('Please select a location before submitting.');
                            setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                            return;
                          }
                          if (!selectedDepartment) {
                            setAiSubmitError('Please select a department before submitting.');
                            setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                            return;
                          }
                          onSubmitAI(
                            { condition_status: aiResult.condition, maintenance_needed: aiResult.maintenanceNeeded, priority: aiResult.priority, feedback: null, ai_response: truncateToWords(aiResult.fullResponse ?? '', FEEDBACK_MAX_WORDS), image_url: imagePreview || null, image_file: imageFile, approval_status: 'pending' },
                            selectedLocation, selectedDepartment
                          );
                        }}
                        style={{ flex: 1, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, padding: 11, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <CheckCircle size={15} /> Done — View Result
                      </button>
                      <button onClick={resetAi} style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                        <RefreshCw size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 py-4 bg-gray-50">
          <button onClick={onBack} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<'scan' | 'confirm' | 'update' | 'result'>('scan');
  const [scannedAsset, setScannedAsset] = useState<ScannedAsset | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitData, setSubmitData] = useState<ManualSubmitData | AiSubmitData | null>(null);
  const [submitType, setSubmitType] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shows the location and department in dropdownlist
  useEffect(() => {
    const load = async () => {
      const [locRes, deptRes] = await Promise.all([
        fetch('/api/location'),
        fetch('/api/department'),
      ]);
      const locJson  = await locRes.json();
      const deptJson = await deptRes.json();
      setLocations(locJson.data   || []);
      setDepartments(deptJson.data || []);
    };
    load();
  }, []);

  const handleSubmitManual = async (
    data: ManualSubmitData | AiSubmitData,
    type: string,
    locationId: string,
    departmentId: string,
  ) => {
    if (!scannedAsset || isSubmitting) return;
    setIsSubmitting(true); setSubmitError(null);
    try {
      let image_base64: string | null = null;
      let image_mime: string | null = null;
      if (data.image_file) {
        image_base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(data.image_file!);
        });
        image_mime = data.image_file.type;
      }
      const response = await fetch('/api/saveMaintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: scannedAsset.id,
          location_id: locationId   || null,
          department_id: departmentId || null,
          condition_status: data.condition_status,
          maintenance_needed: data.maintenance_needed,
          priority: data.priority,
          feedback: (data as ManualSubmitData).feedback ?? null,
          ai_response: null,
          image_base64, image_mime,
          assessed_by: null,
        }),
      });
      const result = await response.json();
      if (!result.success) { setSubmitError(result.error || 'Failed to save'); return; }
      setSubmitData(data); setSubmitType(type); setStep('result');
    } catch { setSubmitError('Unexpected error. Check your connection.'); }
    finally  { setIsSubmitting(false); }
  };

  const handleAiDone = async (data: AiSubmitData, locationId: string, departmentId: string) => {
    if (!scannedAsset || isSubmitting) return;
    setIsSubmitting(true); setSubmitError(null);
    try {
      let image_base64: string | null = null;
      let image_mime: string | null = null;
      if (data.image_file) {
        image_base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(data.image_file!);
        });
        image_mime = data.image_file.type;
      }
      const response = await fetch('/api/saveMaintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id:           scannedAsset.id,
          location_id:        locationId   || null,
          department_id:      departmentId || null,
          condition_status:   data.condition_status,
          maintenance_needed: data.maintenance_needed,
          priority:           data.priority,
          feedback:           null,
          ai_response:        data.ai_response,
          image_base64,
          image_mime,
          assessed_by:        null,
        }),
      });
      const result = await response.json();
      if (!result.success) { setSubmitError(result.error || 'Failed to save'); return; }
      setSubmitData(data); setSubmitType('ai'); setStep('result');
    } catch { setSubmitError('Unexpected error. Check your connection.'); }
    finally  { setIsSubmitting(false); }
  };

  const handleReset = () => {
    setStep('scan'); setScannedAsset(null);
    setSubmitData(null); setSubmitType(null); setSubmitError(null);
  };

  const steps = ['scan', 'confirm', 'update', 'result'] as const;
  const stepLabels = ['Scan', 'Confirm', 'Update', 'Result'];
  const currentIdx = steps.indexOf(step);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      {step === 'scan' && (
        <ScanAssetStep onAssetScanned={(asset) => { setScannedAsset(asset); setStep('confirm'); }} />
      )}

      {step === 'confirm' && scannedAsset && (
        <ConfirmAssetStep
          asset={scannedAsset}
          locations={locations}
          departments={departments}
          onConfirm={() => setStep('update')}
          onBack={() => setStep('scan')}
        />
      )}

      {step === 'update' && scannedAsset && (
        <>
          {submitError && (
            <div className="max-w-2xl mx-auto px-4 pt-4">
              <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">❌ {submitError}</div>
            </div>
          )}
          <UpdateAssetStep
            asset={scannedAsset}
            locations={locations}
            departments={departments}
            onSubmitManual={(data, locId, deptId) => handleSubmitManual(data, 'manual', locId, deptId)}
            onSubmitAI={(data, locId, deptId)     => handleAiDone(data, locId, deptId)}
            onBack={() => setStep('confirm')}
            isSubmitting={isSubmitting}
          />
        </>
      )}

      {step === 'result' && submitData && scannedAsset && (
        <SuccessContent
          scannedCount={1}
          scanType={submitType === 'ai' ? 'AI Assessment' : 'Manual Assessment'}
          item={{
            asset_id: scannedAsset.id,
            name: scannedAsset.name,
            category: scannedAsset.category,
            model: scannedAsset.model,
            condition: submitData.condition_status,
            location_id: scannedAsset.location_id || null,
            department_id: scannedAsset.department_id || null,
          }}
        />
      )}
    </div>
  );
}

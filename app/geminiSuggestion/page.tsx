'use client';

import { useState, useRef, useEffect } from 'react';

export default function TestAssessmentPage() {
  const [assetId, setAssetId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pendingCameraMode, setPendingCameraMode] = useState<'user' | 'environment' | null>(null);

  // Add this useEffect after your states
  useEffect(() => {
    if (pendingCameraMode && videoRef.current) {
      initializeCamera(pendingCameraMode);
      setPendingCameraMode(null);
    }
  }, [pendingCameraMode, showCamera]);

  const initializeCamera = async (mode: 'user' | 'environment') => {
    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      console.log('Requesting camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got stream');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setFacingMode(mode);
        console.log('Camera ready');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(`Failed to access camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setShowCamera(false);
    }
  };
  // Start camera with specified facing mode
  const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    setShowCamera(true);
    setPendingCameraMode(mode);
  };

  // Switch between front and back camera
  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newMode);
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  };

  // Capture photo from camera
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
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, JPG, PNG, or WebP)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }

      setImageFile(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetId || !locationId || !imageFile) {
      setError('Please fill in all fields and select an image');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const response = await fetch('/api/assessAsset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          assetId: assetId,
          locationId: locationId,
          userId: null,
          mimeType: imageFile.type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.assessment);
      } else {
        setError(data.error || 'Assessment failed');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to assess asset. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAssetId('');
    setLocationId('');
    setImageFile(null);
    setImagePreview('');
    setResult(null);
    setError('');
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            🤖 AI Asset Assessment
          </h1>
          <p className="text-gray-600">
            Test the furniture condition assessment system
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Asset ID Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Asset ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="e.g., ASSET-001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              />
            </div>

            {/* Location ID Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="e.g., LOC-001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              />
            </div>

            {/* Image Capture/Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Furniture Image <span className="text-red-500">*</span>
              </label>

              {/* Camera or Upload Choice */}
              {!imageFile && !showCamera && (
                <div className="space-y-3">
                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    📸 Open Camera
                  </button>

                  <div className="text-center text-gray-500 text-sm">OR</div>

                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                      disabled={loading}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold text-blue-600">Click to upload</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          JPEG, JPG, PNG or WebP (max 10MB)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Camera View */}
              {showCamera && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto object-contain"
                      style={{
                        minHeight: '300px',
                        maxHeight: '500px',
                        display: 'block'
                      }}
                      onLoadedMetadata={(e) => {
                        console.log('Video loaded:', {
                          width: e.currentTarget.videoWidth,
                          height: e.currentTarget.videoHeight,
                          readyState: e.currentTarget.readyState
                        });
                      }}
                    />

                    {/* Switch Camera Button (overlay on video) */}
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="absolute top-4 right-4 bg-white bg-opacity-80 p-3 rounded-full shadow-lg hover:bg-opacity-100 transition-all"
                      title="Switch Camera"
                    >
                      <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>

                    {/* Camera indicator */}
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Image Preview */}
              {imageFile && imagePreview && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {imageFile.type} • {(imageFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="text-red-500 hover:text-red-700"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || !assetId || !locationId || !imageFile}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-all shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  '🔍 Assess Asset'
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800">Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Display */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                📊 Assessment Result
              </h2>
              <span className="text-xs text-gray-500">
                ID: {result.id?.substring(0, 8)}...
              </span>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-gray-700 min-w-[140px]">
                  Condition Status:
                </span>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${result.condition === 'In-use'
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : result.condition === 'In-store'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                >
                  {result.condition === 'In-use' && '✅ '}
                  {result.condition === 'In-store' && '📦 '}
                  {result.condition === 'Spoiled' && '❌ '}
                  {result.condition}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-gray-700 min-w-[140px]">
                  Maintenance Required:
                </span>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${result.maintenanceNeeded
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-green-100 text-green-800 border border-green-300'
                    }`}
                >
                  {result.maintenanceNeeded ? '⚠️ Yes' : '✓ No'}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-gray-700 min-w-[140px]">
                  Priority Level:
                </span>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${result.priority === 'high'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : result.priority === 'medium'
                        ? 'bg-orange-100 text-orange-800 border border-orange-300'
                        : result.priority === 'low'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}
                >
                  {result.priority === 'high' && '🚨 '}
                  {result.priority === 'medium' && '⚠️ '}
                  {result.priority === 'low' && 'ℹ️ '}
                  {result.priority === 'none' && '✓ '}
                  {result.priority.charAt(0).toUpperCase() + result.priority.slice(1)}
                </span>
              </div>

              {result.issues && result.issues.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    🔍 Issues Detected:
                  </p>
                  <ul className="space-y-2">
                    {result.issues.map((issue: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span className="text-gray-700">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Assessment ID</p>
                    <p className="font-mono text-gray-900 text-xs">{result.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Assessed At</p>
                    <p className="text-gray-900">
                      {new Date(result.assessedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            How to Use
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-900">
            <li>Enter Asset ID and Location ID</li>
            <li>Click <strong>"Open Camera"</strong> to use your device camera (laptop/mobile)</li>
            <li>Click the <strong>rotate icon</strong> to switch between front/back cameras</li>
            <li>Or choose <strong>"Click to upload"</strong> to select from files</li>
            <li>Click <strong>"Capture Photo"</strong> when ready</li>
            <li>Click <strong>"Assess Asset"</strong> to analyze</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>📱 Works on:</strong> Laptop webcam, mobile front camera, mobile back camera
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
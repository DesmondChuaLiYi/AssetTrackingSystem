// components/scanner/ScannerContext.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, Barcode,
  ChevronLeft,
  XCircle 
} from 'lucide-react';

export default function ScannerContent({
  title,
  description,
  icon: Icon,
  onItemScanned,
  onBack,
  parentScan,
  autoStart = false,
  shouldStartScanning = false,
  onScanningStarted,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onItemScanned: (item: any) => Promise<void>;
  onBack: () => void;
  parentScan: { type: string, id: string, name: string } | null;
  autoStart?: boolean;
  shouldStartScanning?: boolean;
  onScanningStarted?: () => void;
}) {
  const [isScanning, setIsScanning] = useState(false); // Always start as false
  const [scannerError, setScannerError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onItemScannedRef = useRef(onItemScanned);
  const continuousModeRef = useRef(false); // Track if we're in continuous mode
  const scannerRegionId = "qr-reader"; // Use fixed ID
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Keep the callback ref up to date
  useEffect(() => {
    onItemScannedRef.current = onItemScanned;
  }, [onItemScanned]);

  // Handle external trigger to start scanning
  useEffect(() => {
    if (shouldStartScanning && !isScanning) {
      continuousModeRef.current = autoStart; // Set continuous mode based on autoStart
      setIsScanning(true);
      onScanningStarted?.();
    }
  }, [shouldStartScanning, isScanning, onScanningStarted, autoStart]);

  const safeStopAndClear = async (inst: Html5Qrcode | null) => {
    if (!inst) return;
    try {
      const state = await (inst as any).getState();
      if (state === 2) { // 2 = SCANNING state
        await (inst as any).stop();
      }
    } catch (e) {
      // If getState doesn't work, try to stop anyway
      try {
        await (inst as any).stop();
      } catch (stopError) {
        // Silently handle
      }
    }
    try {
      (inst as any).clear();
    } catch (e) {
      // Silently handle
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (isScanning) {
      const startScanner = async () => {
        // Clean up any existing scanner first
        if (scannerRef.current) {
          await safeStopAndClear(scannerRef.current);
          scannerRef.current = null;
        }

        if (!isMounted) return;

        try {
          const scanner = new Html5Qrcode(scannerRegionId);
          scannerRef.current = scanner;

          const config = { fps: 30, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 };

          const onScanSuccess = (decodedText: string) => {
            if (!isMounted) return;

            // Debounce: Ignore duplicate scans within 2 seconds
            const now = Date.now();
            if (lastScannedCodeRef.current === decodedText && now - lastScannedTimeRef.current < 2000) {
              return; // Ignore duplicate scan
            }

            // Update last scanned tracking
            lastScannedCodeRef.current = decodedText;
            lastScannedTimeRef.current = now;

            const newItem = {
              id: Date.now(),
              code: decodedText,
              time: new Date().toLocaleTimeString(),
              name: `Item - ${decodedText}`,
            };

            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77BdGgU+mtn0xG8qBSuBzvLZiTYIGWe77OWfTRAMUKnj7K5iHAY5j9n0xXksBS");
            audio.play().catch(() => {});

            onItemScannedRef.current(newItem);

            // In continuous mode: pause briefly then auto-resume
            // In normal mode: stop completely
            if (continuousModeRef.current) {
              setIsScanning(false); // Pause scanner (don't call stopScanning - it resets continuous mode)
              setTimeout(() => {
                if (isMounted && continuousModeRef.current) {
                  setIsScanning(true); // Resume scanning
                }
              }, 1000); // 1 second pause before resuming
            } else {
              stopScanning(); // Stop completely
            }
          };

          await (scanner as any).start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            () => {}
          );
        } catch (error: any) {
          if (isMounted) {
            setScannerError(error.message || "Camera access denied.");
            setIsScanning(false);
          }
        }
      };
      startScanner();
    }

    return () => {
      isMounted = false;
      const inst = scannerRef.current;
      scannerRef.current = null;
      safeStopAndClear(inst);
    };
  }, [isScanning]);

  const handleStartClick = () => {
    setScannerError(null);
    continuousModeRef.current = autoStart; // Set continuous mode based on autoStart
    setIsScanning(true);
  };
  const stopScanning = () => {
    setIsScanning(false);
    continuousModeRef.current = false; // Exit continuous mode when stopping
  };

  const handleBack = () => {
    if (isScanning) stopScanning();
    onBack();
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* --- THIS IS THE UPDATED HEADER --- */}
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-8 h-8" />
                <div>
                  {!parentScan ? (
                    <>
                      <h1 className="text-2xl font-bold">{title}</h1>
                      <p className="text-sm text-red-100">{description}</p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold">Now Scan an Asset</h1>
                      <p className="text-sm text-red-100">
                        Tagging to {parentScan.type}: <strong>{parentScan.name}</strong>
                      </p>
                    </>
                  )}
                </div>
              </div>
              {parentScan && (
                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/40"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- THIS IS THE UPDATED SCANNER AREA --- */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6 lg:p-8">
            {!isScanning ? (
              <div
                onClick={handleStartClick}
                className="relative w-full h-64 lg:h-80 border-4 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white hover:border-red-400 transition-all cursor-pointer"
              >
                <QrCode className="w-20 h-20 text-red-600 animate-pulse mb-4" />
                <Barcode className="w-20 h-20 text-black opacity-20 absolute" />
                
                {!parentScan ? (
                  <p className="text-lg font-medium text-gray-700">Scan {title.split(' ')[0]}</p>
                ) : (
                  <p className="text-lg font-medium text-gray-700">Scan Asset</p>
                )}

                <p className="text-sm text-gray-500 mt-2">Position the code within the frame</p>
              </div>
            ) : (
              <div className="w-full text-center">
                <div id={scannerRegionId} className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200" />
                <button
                  onClick={stopScanning}
                  className="mt-4 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {scannerError && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
                <strong>Error:</strong> {scannerError}
              </div>
            )}

            <div className="mt-6 p-4 bg-red-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Icon className="w-5 h-5 text-red-600" />
                Scanning Tips:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1 ml-7">
                <li>• Ensure good lighting conditions</li>
                <li>• Hold device steady</li>
                <li>• Keep code centered in frame</li>
              </ul>
            </div>
          </div>
        </div>

        {/* --- THIS IS THE UPDATED FOOTER --- */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 lg:px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleBack}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
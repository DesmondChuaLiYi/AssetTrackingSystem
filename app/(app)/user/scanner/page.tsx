'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import ScannerContent from '@/components/scanner/scannerContext';
import SuccessContent from '@/components/scanner/successContent';
import ConfirmationContent from '@/components/scanner/confirmationContext';
import { Package, Users, MapPin, Building2, CheckCircle, AlertCircle, ShoppingCart, Trash2, X } from 'lucide-react';

// --- CONFIGURATION ---
const configs = {
  asset: { title: "Asset Scanner", description: "Scan asset QR codes or barcodes", icon: Package, idColumn: "asset_id", tableName: "Asset" },
  staff: { title: "Staff ID Scanner", description: "Scan staff identification codes", icon: Users, idColumn: "staff_id", tableName: "Staff" },
  location: { title: "Location Scanner", description: "Scan location QR codes or barcodes", icon: MapPin, idColumn: "location_id", tableName: "Location" },
  department: { title: "Department Scanner", description: "Scan department codes", icon: Building2, idColumn: "department_id", tableName: "Department" },
};

// ============================================
// HELPER COMPONENTS (MODALS)
// ============================================

function StaffConfirmedModal({ staff, assetCount, onContinue }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-500">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Staff Confirmed
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-lg font-bold text-green-900">{staff.name}</p>
            <p className="text-sm text-green-700 mt-1">ID: {staff.staff_id}</p>
            <p className="text-sm text-green-700 mt-2">
              {assetCount > 0 ? `Currently owns ${assetCount} asset(s)` : 'No assets assigned'}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">Now scan assets to assign or unassign them.</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t">
          <button onClick={onContinue} className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            Continue Scanning
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorModal({ message, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-500">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Error
          </h3>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t">
          <button onClick={onClose} className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN SCANNER PAGE
// ============================================
export default function ScannerPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'asset') as keyof typeof configs;

  // Shared State
  const [pageState, setPageState] = useState('scanning');
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<{ item: any, page: string } | null>(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [shouldStartScanning, setShouldStartScanning] = useState(false);

  // Location/Department/Asset State
  const [parentScan, setParentScan] = useState<{ type: string, id: string, name: string } | null>(null);

  // Staff/Cart State
  const [staffData, setStaffData] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const config = configs[type] || configs.asset;

  useEffect(() => {
    setPageState('scanning');
    setScannedItem(null);
    setSubmittedData(null);
    setParentScan(null);
    setStaffData(null);
    setCart([]);
    setScannerKey(prev => prev + 1);
  }, [type]);

  // ============================================================
  // MAIN LOGIC: HANDLE SCAN
  // ============================================================
  const handleItemScanned = async (item: any) => {
    const scannedCode = item.code.trim();

    // --------------------------------------------
    // PATH 1: STAFF SCANNING
    // --------------------------------------------
    if (type === 'staff') {
      if (!staffData) {
        try {
          const { data: existingStaff, error } = await supabase
            .from('Staff')
            .select('*')
            .eq('staff_id', scannedCode)
            .maybeSingle();

          if (error || !existingStaff) {
            setErrorMessage(`Staff ID not found: ${scannedCode}\n\nPlease verify the staff ID exists in the database.`);
            setShowErrorModal(true);
            return;
          }

          const { count } = await supabase
            .from('StaffAsset')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', scannedCode);

          setStaffData({ ...existingStaff, currentAssetCount: count || 0 });
          setShowStaffModal(true);
        } catch (e: any) { setErrorMessage(`Error validating staff: ${e.message}`); setShowErrorModal(true); }
        return;
      }

      // Add Asset to Staff Cart
      try {
        if (cart.some(cartItem => cartItem.asset.asset_id === scannedCode)) {
          setErrorMessage(`Asset ${scannedCode} is already in cart!`);
          setShowErrorModal(true);
          return;
        }

        const { data: existingAsset, error: assetError } = await supabase
          .from('Asset')
          .select('*')
          .eq('asset_id', scannedCode)
          .maybeSingle();

        if (assetError || !existingAsset) {
          setErrorMessage(`Asset not found: ${scannedCode}`);
          setShowErrorModal(true);
          return;
        }

        const { data: assignments } = await supabase
          .from('StaffAsset')
          .select('*')
          .eq('asset_id', scannedCode);

        const currentAssignment = assignments?.[0] || null;
        const ownedByThisStaff = currentAssignment?.staff_id === staffData.staff_id;
        const ownedBySomeoneElse = !!currentAssignment && !ownedByThisStaff;

        let action = 'ASSIGN';
        if (ownedByThisStaff) action = 'UNASSIGN';
        if (ownedBySomeoneElse) action = 'ERROR';

        setCart(prev => [...prev, { id: Date.now(), asset: existingAsset, action, currentOwner: currentAssignment?.staff_id, assignmentId: currentAssignment?.id }]);
        // No need to restart scanner, it continues automatically
      } catch (e: any) { setErrorMessage(`Error: ${e.message}`); setShowErrorModal(true); }
      return;
    }

    // --------------------------------------------
    // PATH 2: ASSET / LOCATION / DEPARTMENT
    // --------------------------------------------
    if (parentScan === null) {
      if (type === 'location' || type === 'department') {
        const { data, error } = await supabase.from(config.tableName).select().ilike(config.idColumn, scannedCode.trim()).single();
        if (error || !data) { alert(`Error: ${type} ID "${scannedCode}" not found.`); return; }
        setParentScan({ type: type, id: scannedCode, name: data.name || scannedCode });
      } else {
        // Normal Asset Scan Mode
        setScannedItem(item);
        setPageState('confirmation');
      }
    }
    // Step B: Second Scan (Tagging Asset)
    else {
      // --- MODIFIED: CART MODE FOR TAGGING ---
      try {
        // 1. Check duplicate
        if (cart.some(c => c.asset.asset_id === scannedCode)) {
          setErrorMessage(`Asset ${scannedCode} is already in the list!`);
          setShowErrorModal(true);
          return;
        }

        // 2. Validate Asset
        const { data: assetData, error: assetError } = await supabase
          .from('Asset')
          .select()
          .eq('asset_id', scannedCode)
          .maybeSingle();

        if (assetError || !assetData) {
          // Treating "Not Found" as an error prevents disrupting the bulk flow.
          setErrorMessage(`Asset "${scannedCode}" not found in database.`);
          setShowErrorModal(true);
          return;
        }

        // 3. Add to Cart with 'TAG' action
        setCart(prev => [...prev, {
          id: Date.now(),
          asset: assetData,
          action: 'TAG',
          target: parentScan.name // For display purposes
        }]);

        // 4. Restart Scanner Immediately
        setTimeout(() => { setScannerKey(prev => prev + 1); }, 500);

      } catch (e: any) {
        setErrorMessage(`Error checking asset: ${e.message}`);
        setShowErrorModal(true);
      }
    }
  };

  // --- HANDLERS ---
  const handleStaffContinue = () => {
    setShowStaffModal(false);
    // Trigger scanner to start
    setShouldStartScanning(true);
  };
  const removeFromCart = (id: number) => { setCart(prev => prev.filter(item => item.id !== id)); };
  const handleErrorClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    // Don't increment key on error close
  };

  const handleSubmitCart = async () => {
    // If no items or (no staff AND no parentScan), exit
    if (cart.length === 0 || (!staffData && !parentScan)) return;

    try {
      const validItems = cart.filter(item => item.action !== 'ERROR');
      if (validItems.length === 0) { setErrorMessage('No valid items to submit!'); setShowErrorModal(true); return; }

      // --- STAFF LOGIC ---
      if (type === 'staff' && staffData) {
        for (const item of validItems) {
          if (item.action === 'ASSIGN') {
            const newId = `SA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await supabase
              .from('StaffAsset')
              .insert({ id: newId, staff_id: staffData.staff_id, asset_id: item.asset.asset_id });
          } else if (item.action === 'UNASSIGN') {
            await supabase
              .from('StaffAsset')
              .delete()
              .eq('id', item.assignmentId);
          }
        }
      }

      // --- LOCATION / DEPARTMENT LOGIC ---
      if ((type === 'location' || type === 'department') && parentScan) {
        for (const item of validItems) {
          // Update all items in the cart to the Parent ID
          await supabase.from('Asset').update({
            [config.idColumn]: parentScan.id, // e.g. location_id or department_id
            updated_dt: new Date().toISOString()
          }).eq('asset_id', item.asset.asset_id);
        }
      }

      // Success Reset
      setSubmittedData({
        item: { name: `${validItems.length} items processed`, code: 'BULK' },
        page: parentScan ? `Tagged to ${parentScan.name}` : 'Staff Assignment'
      });
      setPageState('success');
      setCart([]);
      setStaffData(null);
      setParentScan(null);

    } catch (err: any) {
      setErrorMessage(`Error submitting: ${err.message}`);
      setShowErrorModal(true);
    }
  };

  const handleAssetUpdate = async (newData: any) => {
    if (!scannedItem || type !== 'asset') { alert("Error"); return; }
    try {
      const dataToUpdate = {
        condition: newData.condition,
        location_id: newData.location_id,
        department_id: newData.department_id,
        updated_dt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('Asset')
        .update(dataToUpdate)
        .eq(config.idColumn, scannedItem.code);

      if (error) throw error;
      setSubmittedData({ item: { ...newData, ...dataToUpdate }, page: type });
      setPageState('success');
    } catch (e: any) { alert(e.message); }
  };

  const handleAssetCreate = async (newData: any) => {
    if (!scannedItem) { alert("Error"); return; }
    try {
      const dataToInsert: any = {
        asset_id: scannedItem.code, name: newData.name, description: newData.description, condition: newData.condition,
        created_dt: new Date().toISOString(), location_id: newData.location_id, department_id: newData.department_id,
        category: newData.category, model: newData.model,
      };
      if (parentScan) dataToInsert[parentScan.type + '_id'] = parentScan.id;
      const { error } = await supabase
        .from('Asset')
        .insert(dataToInsert);

      if (error) throw error;
      setSubmittedData({ item: dataToInsert, page: 'New Asset Registered' });
      setPageState('success');
      setParentScan(null);
    } catch (e: any) { alert(e.message); }
  };

  // --- RENDER ---
  if (pageState === 'success') {
    const scanType = (submittedData?.page === 'New Asset Registered' || submittedData?.page.startsWith('Tagged')) ? submittedData.page : configs[type].title.split(" ")[0];
    return <SuccessContent scannedCount={submittedData ? 1 : 0} scanType={scanType} item={submittedData?.item} />;
  }

  if (pageState === 'confirmation') {
    // Changed by Desmond @ 5-Jan-26 : Changed the tableName from asset to config.tableName, same goes for confirmationContext.tsx
    return <ConfirmationContent item={scannedItem} tableName={config.tableName} onBack={() => setPageState('scanning')} onSubmit={handleAssetUpdate} onCreate={handleAssetCreate} parentScan={parentScan} />;
    // End
  }

  return (
    <div className="relative">
      <ScannerContent
        key={scannerKey}
        {...(staffData ? {
          title: "Asset Scanner",
          description: `Scan assets to assign/unassign for ${staffData.name}`,
          icon: Package,
          idColumn: "asset_id",
          tableName: "Asset"
        } : config)}
        onItemScanned={handleItemScanned}
        onBack={() => window.location.href = '/user/dashboard'}
        parentScan={parentScan}
        autoStart={!!staffData}
        shouldStartScanning={shouldStartScanning}
        onScanningStarted={() => setShouldStartScanning(false)}
      />
      {showStaffModal && staffData && <StaffConfirmedModal staff={staffData} assetCount={staffData.currentAssetCount} onContinue={handleStaffContinue} />}
      {showErrorModal && <ErrorModal message={errorMessage} onClose={handleErrorClose} />}

      {/* MODIFIED: Show Cart for Staff OR Location/Dept when active */}
      {cart.length > 0 && (type === 'staff' || parentScan) && (
        <div className="mt-4 px-4 pb-20">
          <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-red-600" /> Cart ({cart.length})</h3><button onClick={() => setCart([])} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button></div>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded border ${item.action === 'ERROR' ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.asset.name}</p>
                      <p className="text-xs font-bold">
                        {item.action === 'TAG' ? `Tagging to ${item.target}` : item.action}
                      </p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-600 hover:bg-red-100 rounded ml-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
              <button onClick={handleSubmitCart} disabled={cart.filter(i => i.action !== 'ERROR').length === 0} className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> Submit Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
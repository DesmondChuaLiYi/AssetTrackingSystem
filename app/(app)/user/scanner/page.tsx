'use client';

// useAuth - ensures only logged-in users can access this page, redirects others to /login
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// All database operations go through our API route instead of calling Supabase directly
const scannerFetch = {
  lookup: async (table: string, idColumn: string, scannedCode: string) => {
    const params = new URLSearchParams({ table, idColumn, scannedCode })
    const res = await fetch(`/api/scanner?${params}`)
    return res.json()
  },
  post: async (body: Record<string, unknown>) => {
    const res = await fetch('/api/scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  },
}
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
} as const;

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
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'asset') as keyof typeof configs;

  if (isAuthLoading || !isAuthenticated) return null;

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
    // PATH 1: STAFF SCANNING (Cart Workflow)
    // --------------------------------------------
    if (type === 'staff') {
      if (!staffData) {
        try {
          const staffResult = await scannerFetch.lookup('Staff', 'staff_id', scannedCode);

          if (!staffResult.success || !staffResult.data) {
            setErrorMessage(`Staff ID not found: ${scannedCode}\n\nPlease verify the staff ID exists in the database.`);
            setShowErrorModal(true);
            return;
          }

          const countResult = await scannerFetch.post({ action: 'count_staff_assets', staffId: scannedCode });
          setStaffData({ ...staffResult.data, currentAssetCount: countResult.count || 0 });
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

        const assetResult = await scannerFetch.lookup('Asset', 'asset_id', scannedCode);

        if (!assetResult.success || !assetResult.data) {
          setErrorMessage(`Asset not found: ${scannedCode}`);
          setShowErrorModal(true);
          return;
        }

        const assignResult = await scannerFetch.post({ action: 'check_asset_assignment', assetId: scannedCode });
        const assignments = assignResult.data ?? [];

        const currentAssignment = assignments[0] || null;
        const ownedByThisStaff = currentAssignment?.staff_id === staffData.staff_id;
        const ownedBySomeoneElse = !!currentAssignment && !ownedByThisStaff;

        let action = 'ASSIGN';
        if (ownedByThisStaff) action = 'UNASSIGN';
        if (ownedBySomeoneElse) action = 'ERROR';

        setCart(prev => [...prev, { id: Date.now(), asset: assetResult.data, action, currentOwner: currentAssignment?.staff_id, assignmentId: currentAssignment?.id }]);
      } catch (e: any) { setErrorMessage(`Error: ${e.message}`); setShowErrorModal(true); }
      return;
    }

    // --------------------------------------------
    // PATH 2: ASSET / LOCATION / DEPARTMENT
    // --------------------------------------------
    if (parentScan === null) {
      if (type === 'location' || type === 'department') {
        const result = await scannerFetch.lookup(config.tableName, config.idColumn, scannedCode);
        if (!result.success || !result.data) { alert(`Error: ${type} ID "${scannedCode}" not found.`); return; }
        setParentScan({ type: type, id: scannedCode, name: result.data.name || scannedCode });
      } else {
        // Normal Asset Scan Mode
        setScannedItem(item);
        setPageState('confirmation');
      }
    } 
    // Step B: Tagging an Asset to the Location/Department
    else {
      try {
        const assetResult = await scannerFetch.lookup('Asset', 'asset_id', scannedCode);

        if (!assetResult.success || !assetResult.data) {
          // ASSET NOT FOUND: Proceed to Registration Screen seamlessly
          setScannedItem(item);
          setPageState('confirmation');
          return;
        }

        // ASSET FOUND: Update immediately and show success (Cart skipped)
        const result = await scannerFetch.post({
          action: 'tag_asset',
          assetId: scannedCode,
          field: config.idColumn,
          value: parentScan.id,
        });

        if (!result.success) throw new Error(result.error || 'Update failed');

        const updatedAssetData = { ...assetResult.data, [parentScan.type + '_id']: parentScan.id };
        setSubmittedData({ item: updatedAssetData, page: `Tagged to ${parentScan.name}` });
        setPageState('success');
        setParentScan(null);

      } catch (e: any) {
        setErrorMessage(`Error tagging asset: ${e.message}`);
        setShowErrorModal(true);
      }
    }
  };

  // --- HANDLERS ---
  const handleStaffContinue = () => {
    setShowStaffModal(false);
    setShouldStartScanning(true);
  };
  const removeFromCart = (id: number) => { setCart(prev => prev.filter(item => item.id !== id)); };
  const handleErrorClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const handleSubmitCart = async () => {
    if (cart.length === 0 || !staffData) return;

    try {
      const validItems = cart.filter(item => item.action !== 'ERROR');
      if (validItems.length === 0) { setErrorMessage('No valid items to submit!'); setShowErrorModal(true); return; }

      // --- STAFF LOGIC ONLY ---
      for (const item of validItems) {
        if (item.action === 'ASSIGN') {
          await scannerFetch.post({ action: 'assign', staffId: staffData.staff_id, assetId: item.asset.asset_id });
        } else if (item.action === 'UNASSIGN') {
          await scannerFetch.post({ action: 'unassign', assignmentId: item.assignmentId });
        }
      }

      setSubmittedData({
        item: { name: `${validItems.length} items processed`, code: 'BULK' },
        page: 'Staff Assignment'
      });
      setPageState('success');
      setCart([]);
      setStaffData(null);

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

      const result = await scannerFetch.post({
        action: 'tag_asset',
        assetId: scannedItem.code,
        field: 'location_id', 
        value: newData.location_id,
      });

      if (!result.success) throw new Error(result.error || 'Update failed');

      await fetch(`/api/assets/${scannedItem.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpdate),
      });

      setSubmittedData({ item: { ...newData, ...dataToUpdate }, page: type });
      setPageState('success');
    } catch (e: any) { alert(e.message); }
  };

  const handleAssetCreate = async (newData: any) => {
    if (!scannedItem) { alert("Error"); return; }
    try {
      const dataToInsert: any = {
        action: 'create_asset',
        asset_id: scannedItem.code,
        name: newData.name,
        description: newData.description,
        condition: newData.condition,
        category: newData.category,
        model: newData.model,
        location_id: newData.location_id,
        department_id: newData.department_id,
      };
      if (parentScan) dataToInsert[parentScan.type + '_id'] = parentScan.id;

      const result = await scannerFetch.post(dataToInsert);
      if (!result.success) throw new Error(result.error || 'Create failed');

      const successPageLabel = parentScan ? `Tagged to ${parentScan.name}` : 'New Asset Registered';
      setSubmittedData({ item: dataToInsert, page: successPageLabel });
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
    // FIX: Dynamic routing to ensure Location/Department parent scans look inside the Asset table, not themselves.
    const targetTable = parentScan ? 'Asset' : config.tableName;
    return <ConfirmationContent item={scannedItem} tableName={targetTable} onBack={() => setPageState('scanning')} onSubmit={handleAssetUpdate} onCreate={handleAssetCreate} parentScan={parentScan} />;
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

      {/* Shopping Cart (ONLY for Staff Scan) */}
      {cart.length > 0 && type === 'staff' && (
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
                        {item.action === 'ASSIGN' ? 'Assigning to Staff' : item.action === 'UNASSIGN' ? 'Removing from Staff' : 'Error: Owned by others'}
                      </p>
                      {item.action === 'ERROR' && (
                        <p className="text-xs text-red-600">Owner: {item.currentOwner}</p>
                      )}
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
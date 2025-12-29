// app/user/scanner/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ScannerContent from '@/components/scanner/scannerContext';
import SuccessContent from '@/components/scanner/successContent';
import ConfirmationContent from '@/components/scanner/confirmationContext';
import { Package, Users, MapPin, Building2, CheckCircle, AlertCircle, ShoppingCart, Trash2, X } from 'lucide-react';

// --- CONFIGURATION ---
const configs = {
  asset: { title: "Asset Scanner", description: "Scan asset QR codes or barcodes", icon: Package, idColumn: "asset_id" },
  staff: { title: "Staff ID Scanner", description: "Scan staff identification codes", icon: Users, idColumn: "staff_id" },
  location: { title: "Location Scanner", description: "Scan location QR codes or barcodes", icon: MapPin, idColumn: "location_id" },
  department: { title: "Department Scanner", description: "Scan department codes", icon: Building2, idColumn: "department_id" },
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
  const [submittedData, setSubmittedData] = useState<{ item: any, page: string } | null>(null); // Fixed type signature
  const [scannerKey, setScannerKey] = useState(0); // Forces scanner reset

  // Location/Department/Asset State
  const [parentScan, setParentScan] = useState<{ type: string, id: string, name: string } | null>(null);

  // Staff/Cart State
  const [staffData, setStaffData] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const config = configs[type] || configs.asset;

  // Reset everything when scan type changes
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
    const scannedCode = item.code;

    // --------------------------------------------
    // PATH 1: STAFF SCANNING (Irene's Logic)
    // --------------------------------------------
    if (type === 'staff') {

      // Step A: If we haven't scanned a staff member yet
      if (!staffData) {
        try {
          // 1. Validate Staff ID
          const { data: existingStaff, error } = await supabase
            .from('staff')
            .select('*')
            .eq('staff_id', scannedCode)
            .maybeSingle();

          if (error || !existingStaff) {
            setErrorMessage(`Staff ID not found: ${scannedCode}`);
            setShowErrorModal(true);
            return;
          }

          // 2. Count assets currently owned
          const { count } = await supabase
            .from('staff_asset') // Assuming this join table exists
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', scannedCode);

          setStaffData({ ...existingStaff, currentAssetCount: count || 0 });
          setShowStaffModal(true); // Show confirmation

        } catch (e: any) {
          setErrorMessage(`Error validating staff: ${e.message}`);
          setShowErrorModal(true);
        }
        return;
      }

      // Step B: If staff IS confirmed, we are scanning ASSETS for the cart
      try {
        // 1. Check if already in cart
        if (cart.some(cartItem => cartItem.asset.asset_id === scannedCode)) {
          setErrorMessage(`Asset ${scannedCode} is already in cart!`);
          setShowErrorModal(true);
          return;
        }

        // 2. Check if asset exists in DB
        const { data: existingAsset, error: assetError } = await supabase
          .from('asset')
          .select('*')
          .eq('asset_id', scannedCode)
          .maybeSingle();

        if (assetError || !existingAsset) {
          setErrorMessage(`Asset not found: ${scannedCode}\nPlease register this asset in Asset Scan first.`);
          setShowErrorModal(true);
          return;
        }

        // 3. Check current ownership status
        const { data: assignments } = await supabase
          .from('staff_asset')
          .select('*')
          .eq('asset_id', scannedCode);

        const currentAssignment = assignments?.[0] || null;
        const ownedByThisStaff = currentAssignment?.staff_id === staffData.staff_id;
        const ownedBySomeoneElse = !!currentAssignment && !ownedByThisStaff;

        // 4. Determine Action
        let action = 'ASSIGN'; // Default
        if (ownedByThisStaff) action = 'UNASSIGN'; // Remove ownership
        if (ownedBySomeoneElse) action = 'ERROR'; // Can't assign, owned by someone else

        // 5. Add to cart
        const cartItem = {
          id: Date.now(),
          asset: existingAsset,
          action: action,
          currentOwner: currentAssignment?.staff_id,
          assignmentId: currentAssignment?.id,
        };

        setCart(prev => [...prev, cartItem]);

        // 6. Restart scanner automatically for next item
        setTimeout(() => {
          setScannerKey(prev => prev + 1);
        }, 500);

      } catch (e: any) {
        setErrorMessage(`Error checking asset: ${e.message}`);
        setShowErrorModal(true);
      }
      return;
    }

    // --------------------------------------------
    // PATH 2: ASSET / LOCATION / DEPARTMENT (Your Logic)
    // --------------------------------------------

    // Step A: First Scan (Location or Department)
    if (parentScan === null) {
      if (type === 'location' || type === 'department') {
        const { data, error } = await supabase
          .from(type)
          .select()
          .ilike(config.idColumn, scannedCode.trim())
          .single();

        if (error || !data) {
          alert(`Error: ${type} ID "${scannedCode}" not found.`);
          return;
        }
        setParentScan({ type: type, id: scannedCode, name: data.name || scannedCode });

      } else {
        // Asset Scan Mode
        setScannedItem(item);
        setPageState('confirmation');
      }
    }
    // Step B: Second Scan (Tagging Asset to Parent)
    else {
      const { data: assetData, error: assetError } = await supabase
        .from('asset')
        .select()
        .eq('asset_id', scannedCode)
        .single();

      if (assetError) {
        // Asset not found -> Go to Register
        setScannedItem(item);
        setPageState('confirmation');
        return;
      }

      try {
        const { error: updateError } = await supabase
          .from('asset')
          .update({ [config.idColumn]: parentScan.id, updated_at: new Date().toISOString() })
          .eq('asset_id', scannedCode);

        if (updateError) throw updateError;

        // Updated Data
        const updatedAssetData = {
          ...assetData,
          [parentScan.type + '_id']: parentScan.id
        };

        setSubmittedData({ item: updatedAssetData, page: `Tagged to ${parentScan.name}` });
        setPageState('success');
        setParentScan(null);

      } catch (e: any) {
        alert(`Error tagging asset: ${e.message}`);
      }
    }
  };


  // ============================================================
  // STAFF CART HELPER FUNCTIONS
  // ============================================================
  const handleStaffContinue = () => {
    setShowStaffModal(false);
    setScannerKey(prev => prev + 1); // Restart scanner
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleErrorClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    setScannerKey(prev => prev + 1); // Restart scanner
  };

  const handleSubmitCart = async () => {
    if (cart.length === 0 || !staffData) return;

    try {
      // Filter out invalid items
      const validItems = cart.filter(item => item.action !== 'ERROR');
      if (validItems.length === 0) {
        setErrorMessage('No valid items to submit!');
        setShowErrorModal(true);
        return;
      }

      // Process items
      for (const item of validItems) {
        if (item.action === 'ASSIGN') {
          // You might need to adjust this ID generation logic depending on your DB
          const newId = `SA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          await supabase.from('staff_asset').insert({
            id: newId, // Remove this line if your DB auto-generates IDs
            staff_id: staffData.staff_id,
            asset_id: item.asset.asset_id
          });

        } else if (item.action === 'UNASSIGN') {
          // Remove from staff_asset table
          await supabase.from('staff_asset').delete().eq('id', item.assignmentId);
        }
      }

      // Success!
      // Note: We need to construct a fake 'item' for the success page since it's a bulk action
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


  // ============================================================
  // ASSET UPDATE/CREATE FUNCTIONS (From Previous)
  // ============================================================
  const handleAssetUpdate = async (newData: any) => {
    // ... (Same logic as before)
    if (!scannedItem || type !== 'asset') { alert("Error"); return; }

    try {
      const dataToUpdate = {
        condition: newData.condition,
        location_id: newData.location_id,
        department_id: newData.department_id,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('asset').update(dataToUpdate).eq(config.idColumn, scannedItem.code);
      if (error) throw error;
      setSubmittedData({ item: { ...newData, ...dataToUpdate }, page: type });
      setPageState('success');
    } catch (e: any) { alert(e.message); }
  };

  const handleAssetCreate = async (newData: any) => {
    if (!scannedItem) { alert("Error"); return; }

    try {
      const dataToInsert: any = {
        asset_id: scannedItem.code,
        name: newData.name,
        description: newData.description,
        condition: newData.condition,
        created_at: new Date().toISOString(),
        location_id: newData.location_id,
        department_id: newData.department_id,
        category: newData.category,
        model: newData.model,
      };

      if (parentScan) {
        dataToInsert[parentScan.type + '_id'] = parentScan.id;
      }

      const { error } = await supabase.from('asset').insert(dataToInsert);
      if (error) throw error;
      setSubmittedData({ item: dataToInsert, page: 'New Asset Registered' });
      setPageState('success');
      setParentScan(null);
    } catch (e: any) { alert(e.message); }
  };


  // ============================================================
  // RENDER
  // ============================================================

  if (pageState === 'success') {
    const scanType = (submittedData?.page === 'New Asset Registered' || submittedData?.page.startsWith('Tagged'))
      ? submittedData.page
      : configs[type].title.split(" ")[0];

    return (
      <SuccessContent
        scannedCount={submittedData ? 1 : 0} // Simplified count
        scanType={scanType}
        item={submittedData?.item}
      />
    );
  }

  if (pageState === 'confirmation') {
    return (
      <ConfirmationContent
        item={scannedItem}
        tableName={'asset'}
        onBack={() => setPageState('scanning')}
        onSubmit={handleAssetUpdate}
        onCreate={handleAssetCreate}
        parentScan={parentScan}
      />
    );
  }

  return (
    <div className="relative">
      <ScannerContent
        key={scannerKey} // Needed for Irene's restart logic
        {...config}
        onItemScanned={handleItemScanned}
        onBack={() => window.location.href = '/user/dashboard'}
        parentScan={parentScan}
      />

      {/* --- IRENE'S COMPONENTS --- */}

      {/* 1. Staff Confirmation Modal */}
      {showStaffModal && staffData && (
        <StaffConfirmedModal
          staff={staffData}
          assetCount={staffData.currentAssetCount}
          onContinue={handleStaffContinue}
        />
      )}

      {/* 2. Error Modal */}
      {showErrorModal && (
        <ErrorModal
          message={errorMessage}
          onClose={handleErrorClose}
        />
      )}

      {/* 3. Shopping Cart (Only visible for Staff Scan) */}
      {cart.length > 0 && type === 'staff' && (
        <div className="mt-4 px-4 pb-20"> {/* Added padding-bottom */}
          <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Cart ({cart.length})
                </h3>
                <button onClick={() => setCart([])} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded border ${item.action === 'ERROR' ? 'bg-red-50 border-red-300' :
                      item.action === 'ASSIGN' ? 'bg-green-50 border-green-300' :
                        'bg-orange-50 border-orange-300'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {item.asset.name}
                      </p>
                      <p className="text-xs font-bold">
                        {item.action === 'ASSIGN' ? 'Assigning to Staff' :
                          item.action === 'UNASSIGN' ? 'Removing from Staff' : 'Error: Owned by others'}
                      </p>
                      {item.action === 'ERROR' && (
                        <p className="text-xs text-red-600">Owner: {item.currentOwner}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded ml-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitCart}
                disabled={cart.filter(i => i.action !== 'ERROR').length === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-base font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Submit Changes ({cart.filter(i => i.action !== 'ERROR').length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
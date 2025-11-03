// app/user/scanner/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ScannerContent from '@/components/scanner/ScannerContext';
import SuccessContent from '@/components/scanner/SuccessContent';
import ConfirmationContent from '@/components/scanner/ConfirmationContent';
import { Package, Users, MapPin, Building2, CheckCircle, AlertCircle, ShoppingCart, Trash2, X } from 'lucide-react';

const configs = {
  asset: { 
    title: "Asset Scanner", 
    description: "Scan asset QR codes or barcodes", 
    icon: Package, 
    idColumn: "asset_id",
    tableName: "asset"
  },
  staff: { 
    title: "Staff ID Scanner", 
    description: "Scan staff identification codes", 
    icon: Users, 
    idColumn: "staff_id",
    tableName: "staff"
  },
  location: { 
    title: "Location Scanner", 
    description: "Scan location QR codes or barcodes", 
    icon: MapPin, 
    idColumn: "location_id",
    tableName: "location"
  },
  department: { 
    title: "Department Scanner", 
    description: "Scan department codes", 
    icon: Building2, 
    idColumn: "department_id",
    tableName: "department"
  },
};

// ============================================
// STAFF CONFIRMED MODAL
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
            {staff.department_id && (
              <p className="text-sm text-green-700">Dept: {staff.department_id}</p>
            )}
            <p className="text-sm text-green-700 mt-2">
              {assetCount > 0 ? `Currently owns ${assetCount} asset(s)` : 'No assets assigned'}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">Now scan an asset to manage ownership</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onContinue}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Continue Scanning
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ERROR MODAL
// ============================================
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
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
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
  
  const [pageState, setPageState] = useState('scanning'); 
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [parentScan, setParentScan] = useState<{ type: string, id: string, name: string } | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  // ✅ STAFF CART SYSTEM
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

  const handleItemScanned = async (item: any) => {
    const scannedCode = item.code;

    // ============================================
    // STAFF: Cart-based workflow
    // ============================================
    if (type === 'staff') {
      // STEP 1: Scan Staff ID (if not yet scanned)
      if (!staffData) {
        try {
          console.log('🔍 Validating staff ID:', scannedCode);
          
          const { data: existingStaff, error } = await supabase
            .from('staff')
            .select('*')
            .eq('staff_id', scannedCode)
            .maybeSingle();

          if (error || !existingStaff) {
            setErrorMessage(`Staff ID not found: ${scannedCode}\n\nPlease register staff first.`);
            setShowErrorModal(true);
            return;
          }

          // Count current assets
          const { count } = await supabase
            .from('staff_asset')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', scannedCode);

          console.log('✅ Staff found:', existingStaff);

          setStaffData({ ...existingStaff, currentAssetCount: count || 0 });
          setShowStaffModal(true);
          
        } catch (e: any) {
          console.error('Error validating staff:', e);
          setErrorMessage(`Error validating staff: ${e.message}`);
          setShowErrorModal(true);
        }
        return;
      }

      // STEP 2: Scan Assets (add to cart)
      try {
        console.log('🔍 Checking asset:', scannedCode);
        
        // Check if already in cart
        if (cart.some(cartItem => cartItem.asset.asset_id === scannedCode)) {
          setErrorMessage(`Asset ${scannedCode} is already in cart!`);
          setShowErrorModal(true);
          return;
        }

        // Check if asset exists
        const { data: existingAsset, error: assetError } = await supabase
          .from('asset')
          .select('*')
          .eq('asset_id', scannedCode)
          .maybeSingle();

        if (assetError || !existingAsset) {
          setErrorMessage(`Asset not found: ${scannedCode}\n\nPlease register asset first.`);
          setShowErrorModal(true);
          return;
        }

        // Check ownership
        const { data: assignments } = await supabase
          .from('staff_asset')
          .select('*')
          .eq('asset_id', scannedCode);

        const currentAssignment = assignments?.[0] || null;
        const ownedByThisStaff = currentAssignment?.staff_id === staffData.staff_id;
        const ownedBySomeone = !!currentAssignment;

        console.log('✅ Asset found:', existingAsset);

        // Add to cart
        const cartItem = {
          id: Date.now(),
          asset: existingAsset,
          action: ownedByThisStaff ? 'UNASSIGN' : ownedBySomeone ? 'ERROR' : 'ASSIGN',
          currentOwner: currentAssignment?.staff_id,
          assignmentId: currentAssignment?.id,
          time: new Date().toLocaleTimeString()
        };

        setCart(prev => [...prev, cartItem]);

        // Auto-restart scanner for next item
        setTimeout(() => {
          setScannerKey(prev => prev + 1);
        }, 500);
        
      } catch (e: any) {
        console.error('Error checking asset:', e);
        setErrorMessage(`Error checking asset: ${e.message}`);
        setShowErrorModal(true);
      }
      return;
    }

    // ============================================
    // LOCATION & DEPARTMENT: Parent-child workflow
    // ============================================
    if (parentScan === null) {
      if (type === 'location' || type === 'department') {
        const { data, error } = await supabase
          .from(type)
          .select()
          .eq(config.idColumn, scannedCode)
          .single();

        if (error || !data) {
          alert(`Error: ${type} ID "${scannedCode}" not found. Please scan a valid ${type}.`);
          return;
        }
        setParentScan({ type: type, id: scannedCode, name: data.name || scannedCode });
        
      } else {
        // ASSET: Show confirmation
        setScannedItem(item);
        setPageState('confirmation');
      }
    } 
    else {
      // Tagging asset to location/department
      const { data: assetData, error: assetError } = await supabase
        .from('asset')
        .select()
        .eq('asset_id', scannedCode)
        .single();

      if (assetError) {
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

        setSubmittedData({ items: [item], page: `Tagged to ${parentScan.name}` });
        setPageState('success');
        setParentScan(null);

      } catch (e: any) {
        alert(`Error tagging asset: ${e.message}`);
      }
    }
  };

  // ============================================
  // STAFF CART HANDLERS
  // ============================================
  const handleStaffContinue = () => {
    setShowStaffModal(false);
    setScannerKey(prev => prev + 1);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmitCart = async () => {
    if (cart.length === 0 || !staffData) return;

    try {
      console.log('📦 Submitting cart:', cart.length, 'items');

      // Filter out error items
      const validItems = cart.filter(item => item.action !== 'ERROR');

      if (validItems.length === 0) {
        setErrorMessage('No valid items to submit!');
        setShowErrorModal(true);
        return;
      }

      // Process each item
      for (const item of validItems) {
        if (item.action === 'ASSIGN') {
          // Generate new ID
          const { data: lastRecord } = await supabase
            .from('staff_asset')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

          let newId = 'SA001';
          if (lastRecord && lastRecord[0]) {
            const num = parseInt(lastRecord[0].id.replace('SA', ''));
            newId = `SA${String(num + 1).padStart(3, '0')}`;
          }

          await supabase
            .from('staff_asset')
            .insert({
              id: newId,
              staff_id: staffData.staff_id,
              asset_id: item.asset.asset_id
            });

        } else if (item.action === 'UNASSIGN') {
          await supabase
            .from('staff_asset')
            .delete()
            .eq('id', item.assignmentId);
        }
      }

      console.log('✅ All items processed');

      setSubmittedData({
        items: validItems,
        page: type
      });
      setPageState('success');
      setCart([]);
      setStaffData(null);

    } catch (err: any) {
      console.error('Error submitting cart:', err);
      setErrorMessage(`Error submitting: ${err.message}`);
      setShowErrorModal(true);
    }
  };

  const handleErrorClose = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    setScannerKey(prev => prev + 1);
  };

  // ============================================
  // ASSET HANDLERS
  // ============================================
  const handleAssetUpdate = async (newData: {
    status: string,
    location_id: string | null,
    department_id: string | null
  }) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset found to update.");
      return;
    }
    
    try {
      const dataToUpdate = {
        status: newData.status,
        location_id: newData.location_id,
        department_id: newData.department_id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('asset')
        .update(dataToUpdate)
        .eq(config.idColumn, scannedItem.code);

      if (error) throw error;
      
      setSubmittedData({ items: [scannedItem], page: type });
      setPageState('success');

    } catch (e: any) {
      alert(`Error updating asset: ${e.message}`);
    }
  };

  const handleAssetCreate = async (newData: { 
    name: string, 
    description: string, 
    status: string,
    location_id: string | null,
    department_id: string | null
  }) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset ID to create.");
      return;
    }

    try {
      const dataToInsert: any = {
        asset_id: scannedItem.code, 
        name: newData.name,
        description: newData.description,
        status: newData.status,
        created_at: new Date().toISOString(),
        location_id: newData.location_id,
        department_id: newData.department_id,
      };
      
      if (parentScan) {
        dataToInsert[parentScan.type + '_id'] = parentScan.id;
      }

      const { error } = await supabase
        .from('asset')
        .insert(dataToInsert);

      if (error) throw error;
      
      setSubmittedData({ items: [scannedItem], page: 'New Asset Registered' });
      setPageState('success');
      setParentScan(null);

    } catch (e: any) {
      alert(`Error creating new asset: ${e.message}`);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (pageState === 'success') {
    return (
      <SuccessContent
        scannedCount={submittedData.items.length}
        scanType={
          (submittedData.page === 'New Asset Registered' || submittedData.page.startsWith('Tagged to'))
            ? submittedData.page
            : configs[submittedData.page as keyof typeof configs].title.split(" ")[0]
        }
      />
    );
  }

  if (pageState === 'confirmation') {
    return (
      <ConfirmationContent
        item={scannedItem}
        tableName={'asset'} 
        onBack={() => {
          setPageState('scanning'); 
        }}
        onSubmit={handleAssetUpdate} 
        onCreate={handleAssetCreate} 
      />
    );
  }

  return (
    <div className="relative">
      <ScannerContent
        key={scannerKey}
        {...config}
        onItemScanned={handleItemScanned}
        onBack={() => window.location.href = '/user/dashboard'}
        parentScan={parentScan}
      />

      {/* Staff Modal */}
      {showStaffModal && staffData && (
        <StaffConfirmedModal
          staff={staffData}
          assetCount={staffData.currentAssetCount}
          onContinue={handleStaffContinue}
        />
      )}

      {/* Cart - Staff workflow only */}
      {cart.length > 0 && type === 'staff' && (
        <div className="mt-4 px-4">
          <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-red-600" />
                  Cart ({cart.length})
                </h3>
                <button
                  onClick={() => setCart([])}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded border ${
                      item.action === 'ERROR' ? 'bg-red-50 border-red-300' :
                      item.action === 'ASSIGN' ? 'bg-green-50 border-green-300' :
                      'bg-orange-50 border-orange-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {item.asset.name} ({item.action})
                      </p>
                      <p className="text-sm text-gray-600 font-mono">
                        {item.asset.asset_id}
                      </p>
                      {item.action === 'ERROR' && (
                        <p className="text-sm text-red-600">
                          ❌ Owned by: {item.currentOwner}
                        </p>
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
                Submit ({cart.filter(i => i.action !== 'ERROR').length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal
          message={errorMessage}
          onClose={handleErrorClose}
        />
      )}
    </div>
  );
}
// app/user/scanner/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ScannerContent from '@/components/scanner/ScannerContext';
import SuccessContent from '@/components/scanner/SuccessContent';
import ConfirmationContent from '@/components/scanner/ConfirmationContent';
import { Package, Users, MapPin, Building2 } from 'lucide-react';

// (configs are unchanged)
const configs = {
  asset: { title: "Asset Scanner", description: "Scan asset QR codes or barcodes", icon: Package, idColumn: "asset_id" },
  staff: { title: "Staff ID Scanner", description: "Scan staff identification codes", icon: Users, idColumn: "staff_id" },
  location: { title: "Location Scanner", description: "Scan location QR codes or barcodes", icon: MapPin, idColumn: "location_id" },
  department: { title: "Department Scanner", description: "Scan department codes", icon: Building2, idColumn: "department_id" },
};

export default function ScannerPage() {
  // (states are unchanged)
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'asset') as keyof typeof configs;
  const [pageState, setPageState] = useState('scanning'); 
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [parentScan, setParentScan] = useState<{ type: string, id: string, name: string } | null>(null);

  const config = configs[type] || configs.asset;

  // (useEffect is unchanged)
  useEffect(() => {
    setPageState('scanning');
    setScannedItem(null);
    setSubmittedData(null);
    setParentScan(null);
  }, [type]);

  // (handleItemScanned is unchanged)
  const handleItemScanned = async (item: any) => {
    // ... (This function is unchanged from the previous step)
    const scannedCode = item.code;

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
        setScannedItem(item);
        setPageState('confirmation');
      }
    } 
    else {
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
  
  // (handleAssetUpdate is unchanged)
  const handleAssetUpdate = async (newData: {
    condition: string,
    location_id: string | null,
    department_id: string | null
  }) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset found to update.");
      return;
    }
    
    try {
      const dataToUpdate = {
        condition: newData.condition,
        updated_condition: newData.condition, 
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

  // --- MODIFIED: This function's signature and data object ---
  const handleAssetCreate = async (newData: { 
    name: string, 
    description: string, 
    condition: string,
    location_id: string | null,
    department_id: string | null,
    category: string, // <-- NEW
    model: string     // <-- NEW
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
        condition: newData.condition,
        created_at: new Date().toISOString(),
        location_id: newData.location_id,
        department_id: newData.department_id,
        category: newData.category, // <-- NEW
        model: newData.model,       // <-- NEW
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

  // (The render section is unchanged)
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
    <ScannerContent
      {...config}
      onItemScanned={handleItemScanned}
      onBack={() => window.location.href = '/user/dashboard'}
      parentScan={parentScan}
   />
  );
}
// app/user/scanner/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ScannerContent from '@/components/scanner/ScannerContext';
import SuccessContent from '@/components/scanner/SuccessContent';
import ConfirmationContent from '@/components/scanner/ConfirmationContent';
import { Package, Users, MapPin, Building2 } from 'lucide-react';

const configs = {
  asset: { title: "Asset Scanner", description: "Scan asset QR codes or barcodes", icon: Package, idColumn: "asset_id" },
  staff: { title: "Staff ID Scanner", description: "Scan staff identification codes", icon: Users, idColumn: "staff_id" },
  location: { title: "Location Scanner", description: "Scan location QR codes or barcodes", icon: MapPin, idColumn: "location_id" },
  department: { title: "Department Scanner", description: "Scan department codes", icon: Building2, idColumn: "department_id" },
};

export default function ScannerPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'asset') as keyof typeof configs;
  
  const [pageState, setPageState] = useState('scanning'); 
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<any>(null); // This will now hold { item: {...}, page: '...' }
  const [parentScan, setParentScan] = useState<{ type: string, id: string, name: string } | null>(null);

  const config = configs[type] || configs.asset;

  useEffect(() => {
    setPageState('scanning');
    setScannedItem(null);
    setSubmittedData(null);
    setParentScan(null);
  }, [type]);

  const handleItemScanned = async (item: any) => {
    // ... (This function is unchanged)
    const scannedCode = item.code;
    if (parentScan === null) {
      if (type === 'location' || type === 'department') {
        const { data, error } = await supabase.from(type).select().eq(config.idColumn, scannedCode).single();
        if (error || !data) {
          alert(`Error: ${type} ID "${scannedCode}" not found.`);
          return;
        }
        setParentScan({ type: type, id: scannedCode, name: data.name || scannedCode });
      } else {
        setScannedItem(item);
        setPageState('confirmation');
      }
    } else {
      const { data: assetData, error: assetError } = await supabase.from('asset').select().eq('asset_id', scannedCode).single();
      if (assetError) {
        setScannedItem(item);
        setPageState('confirmation');
        return;
      }
      try {
        const { error: updateError } = await supabase.from('asset').update({ [config.idColumn]: parentScan.id, updated_at: new Date().toISOString() }).eq('asset_id', scannedCode);
        if (updateError) throw updateError;
        setSubmittedData({ item: { ...assetData, [config.idColumn]: parentScan.id }, page: `Tagged to ${parentScan.name}` });
        setPageState('success');
        setParentScan(null);
      } catch (e: any) {
        alert(`Error tagging asset: ${e.message}`);
      }
    }
  };
  
  // --- MODIFIED: This function now accepts the full asset object ---
  const handleAssetUpdate = async (updatedAsset: any) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset found to update.");
      return;
    }
    
    try {
      // Prepare the data to send to Supabase
      const dataToUpdate = {
        status: updatedAsset.status,
        updated_status: updatedAsset.status, 
        location_id: updatedAsset.location_id,
        department_id: updatedAsset.department_id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('asset')
        .update(dataToUpdate) 
        .eq(config.idColumn, scannedItem.code);

      if (error) throw error;
      
      // --- MODIFIED: Pass the full object to submittedData ---
      setSubmittedData({ item: updatedAsset, page: type });
      setPageState('success');

    } catch (e: any) {
      alert(`Error updating asset: ${e.message}`);
    }
  };

  // --- MODIFIED: This function passes the full object ---
  const handleAssetCreate = async (newData: { 
    name: string, 
    description: string, 
    status: string,
    location_id: string | null,
    department_id: string | null,
    category: string,
    model: string
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
        category: newData.category,
        model: newData.model,
      };
      
      if (parentScan) {
        dataToInsert[parentScan.type + '_id'] = parentScan.id;
      }

      const { error } = await supabase
        .from('asset')
        .insert(dataToInsert);

      if (error) throw error;
      
      // --- MODIFIED: Pass the full dataToInsert object ---
      setSubmittedData({ item: dataToInsert, page: 'New Asset Registered' });
      setPageState('success');
      setParentScan(null);

    } catch (e: any) {
      alert(`Error creating new asset: ${e.message}`);
    }
  };

  // --- MODIFIED: Render section for SuccessContent ---
  if (pageState === 'success') {
    return (
      <SuccessContent
        // Pass the item, pageType, and configs
        item={submittedData.item}
        pageType={submittedData.page}
        configs={configs}
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

  // (ScannerContent render is unchanged)
  return (
    <ScannerContent
      {...config}
      onItemScanned={handleItemScanned}
      onBack={() => window.location.href = '/user/dashboard'}
      parentScan={parentScan}
    />
  );
}
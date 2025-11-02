// app/user/scanner/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Import all your content components
import ScannerContent from '@/components/scanner/ScannerContext'; // Make sure this path is correct
import SuccessContent from '@/components/scanner/SuccessContent';
import ConfirmationContent from '@/components/scanner/ConfirmationContent';

import { Package, Users, MapPin, Building2 } from 'lucide-react';

// Your config is perfect, no change
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
  const [submittedData, setSubmittedData] = useState<any>(null);

  const config = configs[type] || configs.asset;

  useEffect(() => {
    setPageState('scanning');
    setScannedItem(null);
    setSubmittedData(null);
  }, [type]);

  const handleItemScanned = async (item: any) => {
    setScannedItem(item); 

    if (type === 'asset') {
      setPageState('confirmation'); 
    
    } else {
      const dataToInsert = [{
        [config.idColumn]: item.code,
        created_at: new Date().toISOString(),
      }];

      try {
        const { error } = await supabase.from(type).insert(dataToInsert);
        if (error) throw error;
        
        setSubmittedData({ items: [item], page: type });
        setPageState('success'); 
        
      } catch (e: any) {
        alert(`Error saving to ${type}: ${e.message}`);
      }
    }
  };
  
  // This is for UPDATING an existing asset
  const handleAssetUpdate = async (newStatus: string) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset found to update.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('asset')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq(config.idColumn, scannedItem.code);

      if (error) throw error;
      
      setSubmittedData({ items: [scannedItem], page: type });
      setPageState('success');

    } catch (e: any) {
      alert(`Error updating asset: ${e.message}`);
    }
  };

  // --- NEW FUNCTION ---
  // This is for CREATING a new asset
  const handleAssetCreate = async (newData: { name: string, description: string, status: string }) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset ID to create.");
      return;
    }

    try {
      // Prepare the new asset data
      const dataToInsert = {
        asset_id: scannedItem.code, // The scanned code is the new ID
        name: newData.name,
        description: newData.description,
        status: newData.status,
        created_at: new Date().toISOString(),
        // You may need to add other default fields, e.g., location_id: null
      };

      const { error } = await supabase
        .from('asset')
        .insert(dataToInsert);

      if (error) throw error;
      
      setSubmittedData({ items: [scannedItem], page: type });
      setPageState('success');

    } catch (e: any) {
      alert(`Error creating new asset: ${e.message}`);
    }
  };
  // --- END NEW FUNCTION ---

  // Render the correct component based on state
  if (pageState === 'success') {
    return (
      <SuccessContent
        scannedCount={submittedData.items.length}
        scanType={configs[submittedData.page as keyof typeof configs].title.split(" ")[0]}
      />
    );
  }

  if (pageState === 'confirmation') {
    return (
      <ConfirmationContent
        item={scannedItem}
        tableName={type}
        onBack={() => setPageState('scanning')} // Go back to scanning
        onSubmit={handleAssetUpdate} // For editing
        onCreate={handleAssetCreate} // <-- PASS THE NEW PROP
      />
    );
  }

  // Default: pageState === 'scanning'
  return (
    <ScannerContent
      {...config}
      onItemScanned={handleItemScanned}
      onBack={() => window.location.href = '/user/dashboard'} // Or wherever "Home" is
    />
  );
}
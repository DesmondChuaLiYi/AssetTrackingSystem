// app/(app)/admin/assetTracking/addAsset/page.tsx
'use client'

/** Commented by Desmond @ 14-April-26
 * @file addAsset/page.tsx
 * @description Page for adding new assets (file used is dynamicAdd.tsx). This file
 *  loads the config (or fields) dynamically into that page.
 * 
 * This file has the configuration for the DynamicAdd component.
 * All the form logic, validation, record duplication checking, barcode preview
 * is done by DynamicAdd.tsx. This file only describes what the form should look like.
 */
// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicAdd from '@/components/dynamicAdd'
// Type is used so that the config is type-checked against the expected config format
// in the DynamicAdd component.
import type { dynamicAddConfig } from '@/components/dynamicAdd'

const addAssetConfig: dynamicAddConfig = {
  entityName: 'asset',
  entityDisplayName: 'Assets',
  entityDisplayNameSingular: 'Asset',
  apiEndpoint: '/api/assets', // The API route that handles the POST request for creating a new asset
  primaryKey: 'asset_id', // Primary key of the 'Asset' table, used to check for duplicates
  pageTitle: 'Add Asset',
  backUrl: '/admin/assetTracking/assets', // URL to go back to the page after adding new record or cancelling
  // List of form fields, each maps to a db column and a form input
  // ------------------- Form fields ------------------------
  formFields: [
    // ------------- asset_id (PK) ------------------
    {
      key: 'asset_id',
      label: 'Asset ID',
      type: 'text' as const,
      required: true,
      placeholder: 'e.g. SN12345678 (max 30 chars)'
    },

    // -------------- name -------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true,
      placeholder: 'e.g. Lenovo ThinkPad (max 30 chars)'
    },
    
    // -------------- model ----------------
    { 
      key: 'model', 
      label: 'Model', 
      type: 'text' as const, 
      required: true,
      placeholder: 'e.g. X1 Carbon Gen 9 (max 30 chars)' 
    },

    // --------------- description ----------------
    { 
      key: 'description', 
      label: 'Description', 
      type: 'textarea' as const, 
      required: false,
      placeholder: 'Additional details about the asset (max 60 chars)'
    },

    // -------------- category -------------------
    { 
      key: 'category', 
      label: 'Category', 
      type: 'text' as const, 
      required: true,
      placeholder: 'e.g. Laptop, Chair (max 50 chars)'
     },

    // --------------- condition -------------------
    {
      key: 'condition',
      label: 'Condition',
      type: 'select' as const,
      options: [
        { value: 'In-use', label: 'In-use' },
        { value: 'In-store', label: 'In-store' },
        { value: 'Spoiled', label: 'Spoiled' }
      ]
    },

    // ------------------ location_id (FK) -----------------
    // Made optional by removing required
    // Options are populated dynamically using /api/location in DynamicAdd
    { 
      key: 'location_id', 
      label: 'Location (Optional)', 
      type: 'select' as const 
    },

    // ------------------department_id (FK) ----------------
    // Made optional by removing required
    // Options are populated dynamically using /api/department in DynamicAdd
    { 
      key: 'department_id', 
      label: 'Department (Optional)', 
      type: 'select' as const 
    }
  ]
}

// Actual page component - the config is passed to DynamicAdd
export default function AddAssetPage() {
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }
  
  return <DynamicAdd config={addAssetConfig} /> // addAssetConfig is passed to DynamicAdd here
}
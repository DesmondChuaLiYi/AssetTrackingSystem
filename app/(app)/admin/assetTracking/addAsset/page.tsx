'use client'

// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicAdd from '@/components/dynamicAdd'

const addAssetConfig = {
  entityName: 'asset',
  entityDisplayName: 'Assets',
  entityDisplayNameSingular: 'Asset',
  apiEndpoint: '/api/assets',
  primaryKey: 'asset_id',
  pageTitle: 'Add Asset',
  backUrl: '/admin/assetTracking/Assets',
  formFields: [
    {
      key: 'asset_id',
      label: 'Asset ID',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter asset barcode (e.g., from barcode scanner)'
    },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'model', label: 'Model', type: 'text' as const, required: true },
    { key: 'description', label: 'Description', type: 'textarea' as const },
    { key: 'category', label: 'Category', type: 'text' as const, required: true },
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
    { key: 'location_id', label: 'Location (Optional)', type: 'select' as const }, // Made optional by removing required
    { key: 'department_id', label: 'Department (Optional)', type: 'select' as const } // Made optional by removing required
  ]
}

export default function AddAssetPage() {
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) return null

  return <DynamicAdd config={addAssetConfig} />
}
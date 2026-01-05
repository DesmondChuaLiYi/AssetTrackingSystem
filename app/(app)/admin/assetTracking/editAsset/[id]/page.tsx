'use client'

import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'

const editAssetConfig = {
  entityName: 'asset',
  entityDisplayName: 'Assets',
  entityDisplayNameSingular: 'Asset',
  apiEndpoint: '/api/assets',
  primaryKey: 'asset_id',
  pageTitle: 'Edit Asset',
  backUrl: '/admin/assetTracking/Assets',
  formFields: [
    {
      key: 'asset_id',
      label: 'Asset ID',
      type: 'text' as const,
      required: true,
      disabled: true
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

export default function EditAssetPage() {
  const params = useParams()
  const id = params.id as string

  return <DynamicEdit config={editAssetConfig} recordId={id} />
}
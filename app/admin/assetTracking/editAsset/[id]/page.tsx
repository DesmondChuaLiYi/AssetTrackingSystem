'use client'

import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/DynamicEdit'

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
      disabled: true // ID cannot be edited
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
    { key: 'location_id', label: 'Location', type: 'select' as const, required: true },
    { key: 'department_id', label: 'Department', type: 'select' as const, required: true }
  ]
}

export default function EditAssetPage() {
  const params = useParams()
  const id = params.id as string

  return <DynamicEdit config={editAssetConfig} recordId={id} />
}
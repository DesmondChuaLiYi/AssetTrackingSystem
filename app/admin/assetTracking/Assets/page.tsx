'use client'

import DynamicPage from '@/components/DynamicPage'

const assetsConfig = {
  entityName: 'asset',
  entityDisplayName: 'Asset',
  entityDisplayNameSingular: 'Asset',
  apiEndpoint: '/api/assets',
  primaryKey: 'asset_id',
  pageTitle: 'Assets',
  pageDescription: 'Manage and track your organisation\'s assets',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  showConditionFilter: true,
  searchFields: [
    { key: 'name', label: 'Asset Name' },
    { key: 'model', label: 'Model' },
    { key: 'category', label: 'Category' },
    { key: 'asset_id', label: 'Asset ID' }
  ],
  columns: [
    { 
      key: 'asset_id', 
      label: 'Asset ID', 
      sortable: true, 
      render: (v: string) => <span className="font-medium text-gray-900">{v}</span> 
    },
    { key: 'name', label: 'Asset Name', sortable: true },
    { key: 'model', label: 'Model', sortable: false },
    { key: 'category', label: 'Category', sortable: false },
    {
      key: 'condition', label: 'Condition', sortable: false,
      render: (v: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          v === 'In-use' ? 'bg-green-100 text-green-800' :
          v === 'In-store' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>{v}</span>
      )
    },
    { key: 'location', label: 'Location', sortable: false, render: (_: any, row: any) => row.location?.name || 'N/A' },
    { key: 'department', label: 'Department', sortable: false, render: (_: any, row: any) => row.department?.name || 'N/A' },
    { 
      key: 'created_dt', 
      label: 'Created Date', 
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  ],
  formFields: [
    { 
      key: 'asset_id', 
      label: 'Asset ID', 
      type: 'text' as const, 
      disabled: false, 
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
    { key: 'location_id', label: 'Location', type: 'select' as const, required: true },
    { key: 'department_id', label: 'Department', type: 'select' as const, required: true }
  ]
}

export default function AssetsPage() {
  return <DynamicPage config={assetsConfig} />
}
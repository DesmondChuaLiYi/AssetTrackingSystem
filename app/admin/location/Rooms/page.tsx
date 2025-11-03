'use client'

import DynamicPage from '@/components/DynamicPage'

const locationsConfig = {
  entityName: 'location',
  entityDisplayName: 'Location',
  entityDisplayNameSingular: 'Location',
  apiEndpoint: '/api/location',
  primaryKey: 'location_id',
  pageTitle: 'Location',
  pageDescription: 'Manage organisational locations and rooms',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  showConditionFilter: false,
  searchFields: [
    { key: 'name', label: 'Location Name' },
    { key: 'block', label: 'Block' },
    { key: 'description', label: 'Description' }
  ],
  columns: [
    { 
      key: 'location_id', 
      label: 'Location ID', 
      sortable: true, 
      render: (v: string) => <span className="font-medium text-gray-900">{v}</span> 
    },
    { key: 'name', label: 'Location Name', sortable: true },
    { key: 'description', label: 'Description', sortable: false },
    { key: 'block', label: 'Block', sortable: true },
    { key: 'level', label: 'Level', sortable: true },
    { 
      key: 'created_dt', 
      label: 'Created Dt', 
      sortable: true, 
      render: (v: string) => new Date(v).toLocaleDateString()
    }
  ],
  formFields: [
    { 
      key: 'location_id', 
      label: 'Location ID', 
      type: 'text' as const, 
      disabled: false, 
      required: true,
      placeholder: 'Enter location QR code (e.g., from QR scanner)'
    },
    { key: 'name', label: 'Location Name', type: 'text' as const, required: true },
    { key: 'description', label: 'Description', type: 'textarea' as const },
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

export default function LocationsPage() {
  return <DynamicPage config={locationsConfig} />
}
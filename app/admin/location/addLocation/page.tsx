'use client'

import DynamicAdd from '@/components/DynamicAdd'

const addLocationConfig = {
  entityName: 'location',
  entityDisplayName: 'Locations',
  entityDisplayNameSingular: 'Location',
  apiEndpoint: '/api/location',
  primaryKey: 'location_id',
  pageTitle: 'Add Location',
  backUrl: '/admin/location/Rooms',
  formFields: [
    { 
      key: 'location_id', 
      label: 'Location ID', 
      type: 'text' as const, 
      required: true,
      placeholder: 'Enter location code (e.g., from QR code)'
    },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'description', label: 'Description', type: 'textarea' as const },
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

export default function AddLocationPage() {
  return <DynamicAdd config={addLocationConfig} />
}
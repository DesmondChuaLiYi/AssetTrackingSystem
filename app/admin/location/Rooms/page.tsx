'use client'

import DynamicPage, { DynamicPageConfig } from '@/components/DynamicPage'

const config: DynamicPageConfig = {
  entityName: 'location',
  entityDisplayName: 'Locations',
  entityDisplayNameSingular: 'Location',
  apiEndpoint: '/api/location',
  primaryKey: 'location_id',
  pageTitle: 'Location Management',
  pageDescription: 'Manage organisational locations and rooms',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  showConditionFilter: false,
  addUrl: '/admin/location/addLocation',
  editUrl: '/admin/location/editLocation',
  searchFields: [{ key: 'name', label: 'Location Name' }],
  columns: [
    { key: 'location_id', label: 'Location ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'block', label: 'Block', sortable: true },
    { key: 'level', label: 'Level', sortable: true },
    { key: 'room', label: 'Room', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ],
  formFields: [
    { key: 'location_id', label: 'Location ID', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'block', label: 'Block', type: 'text' },
    { key: 'level', label: 'Level', type: 'text' },
    { key: 'room', label: 'Room', type: 'text' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]}
  ]
}

export default function LocationRoomsPage() {
  return <DynamicPage config={config} />
}
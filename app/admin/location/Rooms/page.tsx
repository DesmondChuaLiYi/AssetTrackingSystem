'use client'

import DynamicPage, { DynamicPageConfig } from '@/components/dynamicPage'

const config: DynamicPageConfig = {
  entityName: 'location',
  entityDisplayName: 'Location',
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
  searchFields: [
    { key: 'location_id', label: 'Search by Location ID' },  // First field - will be left search box
    { key: 'name', label: 'Search by Asset Name' }     // Second field - will be right search box
  ],
  columns: [
    { key: 'location_id', label: 'Location ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'block', label: 'Block', sortable: true },
    { key: 'level', label: 'Level', sortable: true },
    {
      key: 'created_dt', label: 'Created Date', sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  ],
  formFields: [
    { key: 'location_id', label: 'Location ID', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'block', label: 'Block', type: 'text' },
    { key: 'level', label: 'Level', type: 'number' }
  ]
}

export default function LocationRoomsPage() {
  return <DynamicPage config={config} />
}
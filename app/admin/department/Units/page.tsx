'use client'

import DynamicPage from '@/components/DynamicPage'

const departmentsConfig = {
  entityName: 'department',
  entityDisplayName: 'Department',
  entityDisplayNameSingular: 'Department',
  apiEndpoint: '/api/department',
  primaryKey: 'department_id',
  pageTitle: 'Department',
  pageDescription: 'Manage organisational departments and units',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  showConditionFilter: false,
  searchFields: [
    { key: 'name', label: 'Department Name' },
    { key: 'department_id', label: 'Department ID' },
    { key: 'block', label: 'Block' }
  ],
  columns: [
    { 
      key: 'department_id', 
      label: 'Department ID', 
      sortable: true, 
      render: (v: string) => <span className="font-medium text-gray-900">{v}</span> 
    },
    { key: 'name', label: 'Department Name', sortable: true },
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
      key: 'department_id', 
      label: 'Department ID', 
      type: 'text' as const, 
      disabled: false, 
      required: true,
      placeholder: 'Enter department QR code (e.g., from QR scanner)'
    },
    { key: 'name', label: 'Department Name', type: 'text' as const, required: true },
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

export default function DepartmentsPage() {
  return <DynamicPage config={departmentsConfig} />
}
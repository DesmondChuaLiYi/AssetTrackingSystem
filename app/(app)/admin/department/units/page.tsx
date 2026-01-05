'use client'

import DynamicPage, { DynamicPageConfig } from '@/components/dynamicPage'

const config: DynamicPageConfig = {
  entityName: 'department',
  entityDisplayName: 'Department',
  entityDisplayNameSingular: 'Department',
  apiEndpoint: '/api/department',
  primaryKey: 'department_id',
  pageTitle: 'Department Management',
  pageDescription: 'Manage organisational departments and units',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  showConditionFilter: false,
  addUrl: '/admin/department/addDepartment',
  editUrl: '/admin/department/editDepartment',
  searchFields: [
    { key: 'department', label: 'Search by Department ID' },  // First field - will be left search box
    { key: 'name', label: 'Search by Department Name' }     // Second field - will be right search box
  ],
  columns: [
    { key: 'department_id', label: 'Department ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
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
    { key: 'department_id', label: 'Department ID', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'block', label: 'Block', type: 'text' },
    { key: 'level', label: 'Level', type: 'number' }
  ]
}

export default function DepartmentPage() {
  return <DynamicPage config={config} />
}
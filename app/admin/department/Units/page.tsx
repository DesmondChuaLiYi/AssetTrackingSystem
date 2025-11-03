'use client'

import DynamicPage, { DynamicPageConfig } from '@/components/DynamicPage'

const config: DynamicPageConfig = {
  entityName: 'department',
  entityDisplayName: 'Departments',
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
  searchFields: [{ key: 'name', label: 'Department Name' }],
  columns: [
    { key: 'department_id', label: 'Department ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ],
  formFields: [
    { key: 'department_id', label: 'Department ID', type: 'text', required: true },
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]}
  ]
}

export default function DepartmentPage() {
  return <DynamicPage config={config} />
}
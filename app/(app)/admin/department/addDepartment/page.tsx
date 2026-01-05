'use client'

import DynamicAdd from '@/components/DynamicAdd'

const addDepartmentConfig = {
  entityName: 'department',
  entityDisplayName: 'Departments',
  entityDisplayNameSingular: 'Department',
  apiEndpoint: '/api/department',
  primaryKey: 'department_id',
  pageTitle: 'Add Department',
  backUrl: '/admin/department/Units',
  formFields: [
    {
      key: 'department_id',
      label: 'Department ID',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter department code (e.g., from barcode scanner)'
    },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

export default function AddDepartmentPage() {
  return <DynamicAdd config={addDepartmentConfig} />
}
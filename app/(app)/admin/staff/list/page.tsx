// app/(app)/admin/staff/list/page.tsx
// Staff listing page using DynamicPage to keep the same layout as assets and department pages.
'use client'

import DynamicPage from '@/components/dynamicPage'
import type { dynamicPageConfig } from '@/components/dynamicPage'
import { useAdminAccess } from '@/hooks/useAdminAccess'

const staffConfig: dynamicPageConfig = {
  entityName: 'staff',
  entityDisplayName: 'Staff',
  entityDisplayNameSingular: 'Staff',
  apiEndpoint: '/api/staff',
  primaryKey: 'staff_id',
  pageTitle: 'Staff',
  pageDescription: 'Manage staff members',
  defaultSortBy: 'created_dt',
  showAddButton: true,
  addUrl: '/admin/staff/addStaff',
  editUrl: '/admin/staff/editStaff',
  searchFields: [
    { key: 'staff_id', label: 'Search by Staff ID' },
    { key: 'name', label: 'Search by Name' }
  ],
  columns: [
    {
      key: 'staff_id',
      label: 'Staff ID',
      sortable: true,
      render: (v: unknown) => <span className="font-medium text-gray-900">{String(v)}</span>
    },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'mobile_no', label: 'Mobile', sortable: false },
    {
      key: 'department',
      label: 'Department',
      sortable: false,
      render: (_: unknown, row: Record<string, unknown>) => {
        const dept = row.department as { name?: string } | null
        return dept?.name ?? 'N/A'
      }
    },
    {
      key: 'created_dt',
      label: 'Created Date',
      sortable: true,
      render: (value: unknown) => new Date(String(value)).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })
    }
  ],
  formFields: [
    { key: 'staff_id', label: 'Staff ID', type: 'text' as const, required: true, placeholder: 'e.g. 12345' },
    { key: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. John Doe' },
    { key: 'email', label: 'Email', type: 'text' as const, required: true, placeholder: 'e.g. john@swin.edu.my' },
    { key: 'mobile_no', label: 'Mobile Number', type: 'text' as const, required: true, placeholder: 'e.g. 0123456789' },
    { key: 'department_id', label: 'Department', type: 'select' as const, required: true }
  ]
}

export default function StaffListPage() {
  const { isLoading, isAdmin } = useAdminAccess()

  if (isLoading || !isAdmin) return null

  return <DynamicPage config={staffConfig} />
}

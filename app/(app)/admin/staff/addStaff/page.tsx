// app/(app)/admin/staff/addStaff/page.tsx
// Add staff page using DynamicAdd, same pattern as addAsset page.
'use client'

import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicAdd from '@/components/dynamicAdd'
import type { dynamicAddConfig } from '@/components/dynamicAdd'

const addStaffConfig: dynamicAddConfig = {
  entityName: 'staff',
  entityDisplayName: 'Staff',
  entityDisplayNameSingular: 'Staff',
  apiEndpoint: '/api/staff',
  primaryKey: 'staff_id',
  pageTitle: 'Add Staff',
  backUrl: '/admin/staff/list',
  formFields: [
    { key: 'staff_id', label: 'Staff ID', type: 'text' as const, required: true, placeholder: 'e.g. 12345 (digits only)' },
    { key: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'e.g. John Doe' },
    { key: 'email', label: 'Email', type: 'text' as const, required: true, placeholder: 'e.g. john@swin.edu.my' },
    { key: 'mobile_no', label: 'Mobile Number', type: 'text' as const, required: true, placeholder: 'e.g. 0123456789' },
    { key: 'department_id', label: 'Department', type: 'select' as const, required: true }
  ]
}

export default function AddStaffPage() {
  const { isLoading, isAdmin } = useAdminAccess()

  if (isLoading || !isAdmin) return null

  return <DynamicAdd config={addStaffConfig} />
}

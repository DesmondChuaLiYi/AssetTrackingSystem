// app/(app)/admin/staff/editStaff/[id]/page.tsx
// Edit staff page using DynamicEdit, same pattern as editAsset page.
'use client'

import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'
import type { dynamicEditConfig } from '@/components/dynamicEdit'

// staff_id is disabled so it cannot be changed after creation
const editStaffConfig: dynamicEditConfig = {
  entityName: 'staff',
  entityDisplayName: 'Staff',
  entityDisplayNameSingular: 'Staff',
  apiEndpoint: '/api/staff',
  primaryKey: 'staff_id',
  pageTitle: 'Edit Staff',
  backUrl: '/admin/staff/list',
  formFields: [
    { key: 'staff_id', label: 'Staff ID', type: 'text' as const, required: true, disabled: true },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'email', label: 'Email', type: 'text' as const, required: true },
    { key: 'mobile_no', label: 'Mobile Number', type: 'text' as const, required: true },
    { key: 'department_id', label: 'Department', type: 'select' as const, required: true }
  ]
}

export default function EditStaffPage() {
  const { isLoading, isAdmin } = useAdminAccess()
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  if (isLoading || !isAdmin) return null

  return <DynamicEdit config={editStaffConfig} recordId={id ?? ''} />
}

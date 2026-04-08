'use client'

// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'

const editDepartmentConfig = {
  entityName: 'department',
  entityDisplayName: 'Departments',
  entityDisplayNameSingular: 'Department',
  apiEndpoint: '/api/department',
  primaryKey: 'department_id',
  pageTitle: 'Edit Department',
  backUrl: '/admin/department/Units',
  formFields: [
    {
      key: 'department_id',
      label: 'Department ID',
      type: 'text' as const,
      required: true,
      disabled: true
    },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

export default function EditDepartmentPage() {
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()
  const params = useParams()
  const id = params.id as string

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) return null

  return <DynamicEdit config={editDepartmentConfig} recordId={id} />
}
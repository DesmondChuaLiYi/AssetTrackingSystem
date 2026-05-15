'use client'

import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicPage from '@/components/dynamicPage'
import type { dynamicPageConfig } from '@/components/dynamicPage'
import {
  ClockIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-MY', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const handleApprove = async (row: Record<string, unknown>, refresh: () => void) => {
  if (!confirm('Approve this registration?')) return
  const res = await fetch('/api/staff/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: row.staff_id }),
  })
  if (res.ok) refresh()
  else alert('Failed to approve staff member')
}

const handleReject = async (row: Record<string, unknown>, refresh: () => void) => {
  if (!confirm('Reject this registration?')) return
  const res = await fetch('/api/staff/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staff_id: row.staff_id }),
  })
  if (res.ok) refresh()
  else alert('Failed to reject staff member')
}

const approvalsConfig: dynamicPageConfig = {
  entityName: 'staff-approvals',
  entityDisplayName: 'Staff',
  entityDisplayNameSingular: 'Staff',
  apiEndpoint: '/api/staff/approvals',
  primaryKey: 'staff_id',
  pageTitle: 'Staff Registration Approvals',
  pageDescription: 'Review and approve pending staff registrations',
  defaultSortBy: 'created_dt',
  showAddButton: false,
  searchFields: [
    { key: 'staff_id', label: 'Search by Staff ID' },
    { key: 'name',     label: 'Search by Name' },
  ],

  tabsConfig: [
    {
      key: 'pending',
      label: 'Pending',
      icon: <ClockIcon className="h-5 w-5" />,
      badgeKey: 'pending',
      activeColor: 'border-yellow-600 text-yellow-600',
    },
    {
      key: 'approved',
      label: 'Approved',
      icon: <CheckIcon className="h-5 w-5" />,
      badgeKey: 'approved',
      activeColor: 'border-green-600 text-green-600',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      icon: <XMarkIcon className="h-5 w-5" />,
      badgeKey: 'rejected',
      activeColor: 'border-red-600 text-red-600',
    },
  ],
  tabQueryParam: 'status',

  customActions: [
    {
      label: 'Approve',
      icon: <CheckIcon className="h-5 w-5" strokeWidth={2.5} />,
      className: 'inline-flex items-center justify-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-xs font-medium',
      show: (_row, activeTab) => activeTab === 'pending',
      onClick: handleApprove,
    },
    {
      label: 'Reject',
      icon: <XMarkIcon className="h-5 w-5" strokeWidth={2.5} />,
      className: 'inline-flex items-center justify-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-xs font-medium',
      show: (_row, activeTab) => activeTab === 'pending',
      onClick: handleReject,
    },
  ],

  columns: [
    { key: 'staff_id',      label: 'Staff ID',   sortable: true },
    { key: 'name',          label: 'Name',        sortable: true },
    { key: 'email',         label: 'Email',       sortable: false },
    { key: 'mobile_no',     label: 'Mobile',      sortable: false },
    { key: 'department_id', label: 'Department',  sortable: false },
    {
      key: 'created_dt',
      label: 'Submitted',
      sortable: true,
      render: (v) => (
        <span className="text-gray-500 whitespace-nowrap">
          {formatDate(v as string)}
        </span>
      ),
    },
  ],

  formFields: [],
}

export default function ApprovalsPage() {
  const { isLoading, isAdmin } = useAdminAccess()

  if (isLoading || !isAdmin) return null

  return <DynamicPage config={approvalsConfig} />
}

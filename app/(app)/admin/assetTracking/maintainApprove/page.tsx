'use client'

// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicPage, { DynamicPageConfig, CustomAction } from '@/components/dynamicPage'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

// Helper function to format date in "dd MMM yyyy, HH:mm" format (e.g. "25 Sep 2024, 14:30") - WC
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-MY', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const parseAiPoints = (text: string): string[] => {
  if (!text) return []
  const issuesSection = text.split(/ISSUES:/i)[1]
  if (issuesSection) {
    const points = issuesSection
      .split('\n')
      .map(l => l.replace(/^[\s\-•*]+/, '').trim())
      .filter(l => l.length > 3)
    if (points.length > 0) return points.slice(0, 3)
  }
  return text
    .split(/[\n\r]+/)
    .map(l => l.replace(/^[\s\-•*\d.]+/, '').trim())
    .filter(l => l.length > 10 && l.length < 120)
    .slice(0, 3)
}

// ── Action handlers — passed to customActions, receive (row, refresh) ─────────

const handleApprove = async (row: any, refresh: () => void) => {
  if (!confirm('Are you sure you want to approve this maintenance request?')) return
  const res = await fetch('/api/approveAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessmentId: row.id }),
  })
  if (res.ok) refresh()
  else alert('Failed to approve')
}

const handleReject = async (row: any, refresh: () => void) => {
  if (!confirm('Are you sure you want to reject this maintenance request?')) return
  const res = await fetch('/api/rejectAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessmentId: row.id }),
  })
  if (res.ok) refresh()
  else alert('Failed to reject')
}

const handleReopen = async (row: any, refresh: () => void) => {
  if (!confirm('Reopen this assessment and move it back to pending?')) return
  const res = await fetch('/api/reopenAssessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessmentId: row.id }),
  })
  if (res.ok) refresh()
  else alert('Failed to reopen')
}

//  DynamicPageConfig for Maintenance Page
const maintenanceConfig: DynamicPageConfig = {
  entityName: 'maintenance',
  entityDisplayName: 'Maintenance Assessments',
  entityDisplayNameSingular: 'Assessment',
  apiEndpoint: '/api/pendingAssessments',
  primaryKey: 'id',
  pageTitle: 'Maintenance Review',
  pageDescription: 'Review and approve pending asset maintenance requests',
  defaultSortBy: 'assessed_dt',
  showAddButton: false,
  showConditionFilter: true,
  searchFields: [
    { key: 'asset_id',    label: 'Search by Asset ID' },
    { key: 'location_id', label: 'Search by Location'  },
  ],

  // Tabs config for filtering by approval status (pending/approved/rejected) - WC
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
      icon: <CheckCircleIcon className="h-5 w-5" />,
      badgeKey: 'approved',
      activeColor: 'border-green-600 text-green-600',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      icon: <XCircleIcon className="h-5 w-5" />,
      badgeKey: 'rejected',
      activeColor: 'border-red-600 text-red-600',
    },
  ],
  tabQueryParam: 'status',

  //  Custom row actions (replaces Edit/Delete) 
  customActions: [
    {
      label: 'View',
      icon: <EyeIcon className="h-5 w-5" />,
      className: 'inline-flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors',
      // View is shown on pending always; on approved/rejected only if image exists
      show: (row, activeTab) =>
        activeTab === 'pending' || !!row.image_url,
      onClick: (_row, _refresh) => {
        // View opens the modal — handled via modalConfig.renderModal below
        // DynamicPage sets selectedRow when this action is clicked if label === 'View'
        // See modalConfig below for the actual modal content
      },
    },
    {
      label: 'Approve',
      icon: <CheckCircleIcon className="h-5 w-5" />,
      className: 'inline-flex items-center justify-center w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors',
      show: (_row, activeTab) => activeTab === 'pending',
      onClick: handleApprove,
    },
    {
      label: 'Reject',
      icon: <XCircleIcon className="h-5 w-5" />,
      className: 'inline-flex items-center justify-center w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors',
      show: (_row, activeTab) => activeTab === 'pending',
      onClick: handleReject,
    },
    {
      label: 'Reopen',
      icon: <ArrowPathIcon className="h-4 w-4" />,
      className: 'w-full inline-flex items-center justify-center gap-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors text-xs font-medium',
      show: (_row, activeTab) => activeTab === 'approved' || activeTab === 'rejected',
      onClick: handleReopen,
    },
  ],

  // Custom modal for viewing asset image and details (triggered by "View" action) - WC
  modalConfig: {
    renderModal: (row, onClose) => (
      <div className="bg-white rounded-lg p-4 max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-semibold text-gray-800">
            Asset Image — {row.asset_id}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {row.image_url ? (
          <div className="border rounded-lg overflow-hidden bg-gray-100">
            <img src={row.image_url} alt="Asset" className="w-full max-h-[50vh] object-contain" />
          </div>
        ) : (
          <div className="border rounded-lg bg-gray-100 h-48 flex items-center justify-center text-gray-400 text-sm">
            No image available
          </div>
        )}
      </div>
    ),
  },

  // Columns config — defines table columns and how to render them. 
  // Actions column is auto-appended by DynamicPage when customActions are defined (see above) - WC
  columns: [
    {
      key: 'asset_id',
      label: 'Asset ID',
      sortable: false,
      render: (v: string) => <span className="font-medium text-gray-900">{v}</span>,
    },
    {
      key: 'location_id',
      label: 'Location',
      sortable: false,
    },
    {
      key: 'condition_status',
      label: 'Condition',
      sortable: false,
      render: (v: string) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          v === 'Spoiled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>{v}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: false,
      render: (v: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          v === 'high'   ? 'bg-red-100 text-red-800'      :
          v === 'medium' ? 'bg-orange-100 text-orange-800' :
                           'bg-yellow-100 text-yellow-800'
        }`}>{v?.toUpperCase()}</span>
      ),
    },
    {
      key: 'assessed_dt',
      label: 'Assessed At',
      sortable: false,
      render: (v: string) => <span className="text-gray-500 whitespace-nowrap">{formatDate(v)}</span>,
    },
    {
      // Response column: capped at 220px with line-clamp so Actions stays visible (WC)
      key: 'ai_response',
      label: 'Response',
      sortable: false,
      render: (v: string, row: any) => (
        <div style={{ maxWidth: '220px', width: '220px' }}>
          {v ? (
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 w-fit">
                AI Response
              </span>
              <ul className="space-y-1">
                {parseAiPoints(v).length > 0 ? parseAiPoints(v).map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 leading-snug line-clamp-2">{point}</span>
                  </li>
                )) : <li className="text-xs text-gray-400 italic">No details</li>}
              </ul>
            </div>
          ) : row.feedback ? (
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit">
                Staff feedback
              </span>
              <p className="text-xs text-gray-700 leading-snug line-clamp-3">{row.feedback}</p>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">No response</span>
          )}
        </div>
      ),
    },
    {
      key: 'approval_status',
      label: 'Status',
      sortable: false,
      render: (v: string) => {
        if (!v || v === 'pending') return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-yellow-700 whitespace-nowrap">
            <ClockIcon className="h-4 w-4" /> Pending
          </span>
        )
        if (v === 'approved') return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-green-900 whitespace-nowrap">
            <CheckCircleIcon className="h-4 w-4" /> Approved
          </span>
        )
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-red-900 whitespace-nowrap">
            <XCircleIcon className="h-4 w-4" /> Rejected
          </span>
        )
      },
    },
  ],

  // formFields is required by DynamicPageConfig but not used for maintenance
  // (no add/edit form — assessments are created by the AI assessment flow) (WC)
  formFields: [],
}

export default function MaintenanceReviewPage() {
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) return null

  return <DynamicPage config={maintenanceConfig} />
}

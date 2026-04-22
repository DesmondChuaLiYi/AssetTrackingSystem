'use client'

import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import Breadcrumb from '@/components/ui/breadcrumb'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface PendingStaff {
  staff_id: string
  name: string
  email: string
  mobile_no: string
  department_id: string
  status: string
  created_dt: string
}

export default function ApprovalsPage() {
  const { session, isLoading: sessionLoading } = useAdminAccess()
  // const router = useRouter()

  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([])
  const [approvedStaff, setApprovedStaff] = useState<PendingStaff[]>([])
  const [rejectedStaff, setRejectedStaff] = useState<PendingStaff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const breadcrumbItems = [
    { label: 'Home', href: '/admin/dashboard', isClickable: true },
    { label: 'Staff', href: '/admin/staff/List', isClickable: true },
    { label: 'Approvals', href: '', isClickable: false }
  ]

  useEffect(() => {
    if (session) {
      fetchAllStaff()
    }
  }, [session])

  const fetchAllStaff = async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/staff/pending'),
        fetch('/api/staff/approved'),
        fetch('/api/staff/rejected')
      ])

      const [pendingData, approvedData, rejectedData] = await Promise.all([
        pendingRes.json(),
        approvedRes.json(),
        rejectedRes.json()
      ])

      if (pendingData.success) setPendingStaff(pendingData.staff || [])
      if (approvedData.success) setApprovedStaff(approvedData.staff || [])
      if (rejectedData.success) setRejectedStaff(rejectedData.staff || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (staff_id: string) => {
    if (!confirm('Are you sure you want to approve this registration?')) {
      return
    }

    setProcessingId(staff_id)

    try {
      const response = await fetch('/api/staff/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id })
      })

      const data = await response.json()

      if (data.success) {
        alert('Staff member approved successfully!')
        fetchAllStaff() // Refresh all lists
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error approving staff:', error)
      alert('Failed to approve staff member')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (staff_id: string) => {
    if (!confirm('Are you sure you want to reject this registration?')) {
      return
    }

    setProcessingId(staff_id)

    try {
      const response = await fetch('/api/staff/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id })
      })

      const data = await response.json()

      if (data.success) {
        alert('Staff member rejected successfully!')
        fetchAllStaff() // Refresh all lists
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error rejecting staff:', error)
      alert('Failed to reject staff member')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Show loading while session is loading or checking access
  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      <main className="p-6 flex-grow ml-auto w-[81%]">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb customItems={breadcrumbItems} />
          {/* Header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Registration Approvals</h1>
              <p className="text-gray-600 mt-2">Review and approve pending staff registrations</p>
            </div>
            <button
              onClick={() => fetchAllStaff()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'pending'
                  ? 'border-b-2 border-yellow-600 text-yellow-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Pending ({pendingStaff.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'approved'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  Approved ({approvedStaff.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'rejected'
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5" />
                  Rejected ({rejectedStaff.length})
                </div>
              </button>
            </div>
          </div>

          {/* Staff List */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : activeTab === 'pending' && pendingStaff.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending registrations</p>
                <p className="text-gray-400 text-sm mt-2">All registrations have been processed</p>
              </div>
            ) : activeTab === 'approved' && approvedStaff.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-lg">No approved staff</p>
              </div>
            ) : activeTab === 'rejected' && rejectedStaff.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-lg">No rejected registrations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Staff ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(activeTab === 'pending' ? pendingStaff : activeTab === 'approved' ? approvedStaff : rejectedStaff).map((staff) => (
                      <tr key={staff.staff_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.staff_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.mobile_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.department_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(staff.created_dt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {activeTab === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(staff.staff_id)}
                                disabled={processingId === staff.staff_id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:bg-gray-400"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(staff.staff_id)}
                                disabled={processingId === staff.staff_id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:bg-gray-400"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          )}
                          {activeTab === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                              <CheckCircleIcon className="h-4 w-4" />
                              Approved
                            </span>
                          )}
                          {activeTab === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-md text-xs font-medium">
                              <XCircleIcon className="h-4 w-4" />
                              Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

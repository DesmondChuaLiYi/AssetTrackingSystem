'use client'

import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Dashboard from '../admin/dashboard/page'
import { useSession } from '@/components/SessionProvider'

export default function ProfilePage() {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const router = useRouter()
  const { session } = useSession()
  const [assignedAssets, setAssignedAssets] = useState<any[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)

  // Fetch assigned assets when session is available
  useEffect(() => {
    const fetchAssets = async () => {
      if (!session?.staffId) {
        setIsLoadingAssets(false)
        return
      }

      try {
        const response = await fetch('/api/staff/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: session.staffId })
        })

        const data = await response.json()

        if (data.success) {
          setAssignedAssets(data.assets || [])
        }
      } catch (error) {
        console.error('Error fetching assets:', error)
      } finally {
        setIsLoadingAssets(false)
      }
    }

    fetchAssets()
  }, [session])

  // Show max 3 assets, with "View All" if more than 3
  const displayAssets = assignedAssets.slice(0, 3)
  const hasMoreAssets = assignedAssets.length > 3

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      <Dashboard />
      <main className="p-6 flex-grow ml-auto w-[81%] bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">User Profile</h1>
              <div className="h-1 w-20 bg-red-600 rounded"></div>
            </div>

            {/* User Information */}
            <div className="space-y-4">
              {/* User Name */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                  User Name:
                </label>
                <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                  {session?.name || 'Loading...'}
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                  Email:
                </label>
                <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                  {session?.email || 'N/A'}
                </div>
              </div>

              {/* User ID */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                  Staff ID:
                </label>
                <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                  {session?.staffId || 'N/A'}
                </div>
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                  Mobile:
                </label>
                <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                  {session?.mobileNo || 'N/A'}
                </div>
              </div>

              {/* Department */}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <label className="text-sm font-semibold text-gray-700 w-full sm:w-40 mb-1 sm:mb-0">
                  Department:
                </label>
                <div className="text-gray-900 bg-gray-50 px-4 py-2 rounded-md flex-1">
                  {session?.departmentId || 'N/A'}
                </div>
              </div>

              {/* Assigned Assets */}
              <div className="pt-4">
                <label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Assigned Assets:
                </label>
                <div className="space-y-3">
                  {isLoadingAssets ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading assets...
                    </div>
                  ) : displayAssets.length > 0 ? (
                    <>
                      {displayAssets.map((assignment: any) => (
                        <div
                          key={assignment.id}
                          className="bg-white border-2 border-gray-300 rounded-full px-4 py-3 flex items-center justify-between hover:border-red-400 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {assignment.asset?.name || 'Unknown Asset'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {assignment.asset?.asset_id || assignment.asset_id} • {assignment.asset?.category || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* View All Button */}
                      {hasMoreAssets && (
                        <button
                          onClick={() => alert('Assigned Assets page - to be implemented')}
                          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full px-4 py-3 flex items-center justify-center space-x-2 transition-colors"
                        >
                          <span className="text-lg font-semibold">+</span>
                          <span className="text-sm font-medium">View All Assets ({assignedAssets.length})</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No assets assigned yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
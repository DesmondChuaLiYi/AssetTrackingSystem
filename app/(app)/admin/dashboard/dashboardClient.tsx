'use client'

/** Commented by Desmond @ 20-May-2026
 * Client-side shell for the dashboard page.
 * Handles all interactive state: session check, stats fetching,
 * entity view selector, and refresh button.
 *
 * The chart is passed in as a ReactNode from page.tsx (Server Component),
 * so AssetChartLoader is never imported here — which is what caused the
 * "Missing SUPABASE_SERVICE_ROLE_KEY" error when this file had 'use client'.
 *
 * Changing entityView updates the URL search param (?entityView=department),
 * which triggers a server re-render of page.tsx with the new value.
 */

import { useState, useEffect } from 'react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useRouter, usePathname } from 'next/navigation'
import Breadcrumb from '@/components/ui/breadcrumb'
import {
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  UsersIcon,
  MapPinIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

type EntityView = 'assets' | 'department' | 'location'

interface DashboardStats {
  totalAssets: number
  totalDepartments: number
  totalStaff: number
  totalLocations: number
}

interface DashboardClientProps {
  // The chart is rendered server-side and passed in as a ReactNode.
  // This keeps AssetChartLoader out of the client bundle entirely.
  chart: React.ReactNode
  // Current entityView read from the URL by page.tsx
  entityView: EntityView
}

export default function DashboardClient({ chart, entityView }: DashboardClientProps) {
  const { session, isLoading: sessionLoading } = useAdminAccess()
  const router = useRouter()
  const pathname = usePathname()
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    totalDepartments: 0,
    totalStaff: 0,
    totalLocations: 0
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || sessionLoading) return
    if (!session) return
    fetchDashboardData()
  }, [session, mounted, sessionLoading])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [assetsRes, departmentsRes, staffRes, locationsRes] = await Promise.all([
        fetch('/api/assets?limit=1'),
        fetch('/api/department'),
        fetch('/api/staff/list'),
        fetch('/api/location')
      ])
      const [assetsData, departmentsData, staffData, locationsData] = await Promise.all([
        assetsRes.json(),
        departmentsRes.json(),
        staffRes.json(),
        locationsRes.json()
      ])
      setStats({
        totalAssets: assetsData.totalItems || 0,
        totalDepartments: departmentsData.data?.length || 0,
        totalStaff: staffData.staff?.length || 0,
        totalLocations: locationsData.data?.length || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update the URL search param so page.tsx re-renders the chart server-side
  // with the new entityView — no client-side state needed for this
  const handleEntityViewChange = (view: EntityView) => {
    router.push(`${pathname}?entityView=${view}`)
  }

  const statCards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      icon: ComputerDesktopIcon,
      color: 'bg-blue-500',
      href: '/admin/assetTracking/assets'
    },
    {
      title: 'Departments',
      value: stats.totalDepartments,
      icon: BuildingOfficeIcon,
      color: 'bg-green-500',
      href: '/admin/department/units'
    },
    {
      title: 'Staff Members',
      value: stats.totalStaff,
      icon: UsersIcon,
      color: 'bg-purple-500',
      href: '/admin/staff/list'
    },
    {
      title: 'Locations',
      value: stats.totalLocations,
      icon: MapPinIcon,
      color: 'bg-orange-500',
      href: '/admin/location/rooms'
    }
  ]

  if (!mounted || sessionLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="p-6">
        <div className="w-full mx-auto">
          <Breadcrumb />

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back, {session?.user?.name || 'User'}</p>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((card, index) => {
              const IconComponent = card.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(card.href)}
                >
                  <div className="flex items-center">
                    <div className={`${card.color} p-3 rounded-lg`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <div className="text-2xl font-bold text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                        ) : (
                          card.value.toLocaleString()
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/assetTracking/assets')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">View All Assets</h3>
                <p className="text-sm text-gray-600 mt-1">Manage and track all assets</p>
              </button>
              <button
                onClick={() => router.push('/admin/staff/list')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Manage Staff</h3>
                <p className="text-sm text-gray-600 mt-1">Add or update staff members</p>
              </button>
              <button
                onClick={() => router.push('/admin/department/units')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Departments</h3>
                <p className="text-sm text-gray-600 mt-1">Manage departments and locations</p>
              </button>
            </div>
          </div>

          {/* Chart Section and Recent Activity - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-xl">Analytics</p>
                <select
                  value={entityView}
                  onChange={e => handleEntityViewChange(e.target.value as EntityView)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 focus:border-blue-400 outline-none cursor-pointer h-9"
                >
                  <option value="assets">Assets</option>
                  <option value="department">Department</option>
                  <option value="location">Location</option>
                </select>
              </div>
              {/* Chart rendered server-side, passed in as a prop from page.tsx */}
              {chart}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                <div>
                  <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Recent activity tracking will be implemented here</p>
                  <p className="text-sm mt-1">Asset assignments, updates, and system changes</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

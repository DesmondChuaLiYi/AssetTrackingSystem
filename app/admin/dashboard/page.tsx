'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/SessionProvider'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import {
  ComputerDesktopIcon,
  BuildingOfficeIcon,
  UsersIcon,
  MapPinIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalAssets: number
  totalDepartments: number
  totalStaff: number
  totalLocations: number
}

export default function DashboardPage() {
  const { session } = useSession()
  const router = useRouter()
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
    if (!mounted) return
    if (!session) {
      router.push('/')
      return
    }
    fetchDashboardData()
  }, [session, mounted, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [assetsRes, departmentsRes, staffRes, locationsRes] = await Promise.all([
        fetch('/api/assets?limit=1'),
        fetch('/api/departments'),
        fetch('/api/staff/list'),
        fetch('/api/locations')
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

  const statCards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      icon: ComputerDesktopIcon,
      color: 'bg-blue-500',
      href: '/admin/assetTracking/Assets'
    },
    {
      title: 'Departments',
      value: stats.totalDepartments,
      icon: BuildingOfficeIcon,
      color: 'bg-green-500',
      href: '/admin/assetManage/departments'
    },
    {
      title: 'Staff Members',
      value: stats.totalStaff,
      icon: UsersIcon,
      color: 'bg-purple-500',
      href: '/admin/staff/List'
    },
    {
      title: 'Locations',
      value: stats.totalLocations,
      icon: MapPinIcon,
      color: 'bg-orange-500',
      href: '/admin/assetManage/locations'
    }
  ]

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb />
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back, {session?.name || 'User'}</p>
              </div>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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
                      <p className="text-2xl font-bold text-gray-900">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                        ) : (
                          card.value.toLocaleString()
                        )}
                      </p>
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
                onClick={() => router.push('/admin/assetTracking/Assets')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">View All Assets</h3>
                <p className="text-sm text-gray-600 mt-1">Manage and track all assets</p>
              </button>
              <button
                onClick={() => router.push('/admin/staff/List')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Manage Staff</h3>
                <p className="text-sm text-gray-600 mt-1">Add or update staff members</p>
              </button>
              <button
                onClick={() => router.push('/admin/assetManage/departments')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Departments</h3>
                <p className="text-sm text-gray-600 mt-1">Manage departments and locations</p>
              </button>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="text-center py-12 text-gray-500">
              <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Recent activity tracking will be implemented here</p>
              <p className="text-sm mt-1">Asset assignments, updates, and system changes</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

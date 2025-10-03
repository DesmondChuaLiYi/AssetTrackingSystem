'use client'

import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import LogoutButton from '@/components/LogoutButton'
import { useSession } from '@/components/SessionProvider'
import {
  Bars3Icon,
  UserCircleIcon,
  CogIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

// Sidebar items with dropdowns
const sidebarItems = [
  { name: 'Dashboard', icon: Bars3Icon, href: '/admin/dashboard' },
  {
    name: 'Asset Management',
    icon: CogIcon,
    href: '/asset-management',
    dropdown: ['Assets', 'Categories', 'Reports'],
  },
  {
    name: 'Location',
    icon: MapPinIcon,
    href: '/location',
    dropdown: ['Sites', 'Rooms', 'Zones'],
  },
  {
    name: 'Department',
    icon: BuildingOfficeIcon,
    href: '/department',
    dropdown: ['Units', 'Teams', 'Budgets'],
  },
  {
    name: 'Staff',
    icon: UsersIcon,
    href: '/staff',
    dropdown: ['Add Staff', 'Employees', 'Roles', 'Attendance'],
  },
]

const profileItems = [
  { name: 'My Profile', icon: UserCircleIcon, href: '/profile' },
  { name: 'Settings', icon: CogIcon, href: '/settings' },
  { name: 'Log Out', icon: UserCircleIcon, href: '/logout' }, // Icon not used, LogoutButton has its own
]

const sidebarVariants = {
  open: { x: 0, opacity: 1, width: '16rem', transition: { duration: 0.3, ease: 'easeInOut' } },
  closed: { x: -250, opacity: 0, width: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
  mobileOpen: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
  mobileClosed: { y: '-100%', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
}

export default function ProfilePage() {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const router = useRouter()
  const { session } = useSession()
  const [assignedAssets, setAssignedAssets] = useState<any[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<string | null>('/profile')
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isTopBarVisible, setIsTopBarVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

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

  // Handle scroll to hide/show top bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY) {
        setIsTopBarVisible(false)
      } else {
        setIsTopBarVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setIsSidebarOpen(!mobile)
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Toggle dropdown without navigation
  const toggleDropdown = (href: string) => {
    setActiveItem(activeItem === href ? null : href)
  }

  // Close sidebar on mobile when clicking outside
  const handleOutsideClick = (e: MouseEvent) => {
    if (isMobile && isSidebarOpen && !(e.target as HTMLElement).closest('.sidebar')) {
      setIsSidebarOpen(false)
    }
  }

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.addEventListener('click', handleOutsideClick)
    }
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [isMobile, isSidebarOpen])

  // Show max 3 assets, with "View All" if more than 3
  const displayAssets = assignedAssets.slice(0, 3)
  const hasMoreAssets = assignedAssets.length > 3

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className={`sidebar bg-white shadow-lg flex flex-col z-40 overflow-hidden ${
              isMobile
                ? 'fixed top-0 left-0 w-full h-[calc(100%-64px)] p-4 pt-6'
                : 'fixed left-0 top-0 min-h-screen w-64 p-4'
            }`}
            variants={sidebarVariants}
            initial={isMobile ? 'mobileClosed' : 'closed'}
            animate={isMobile ? 'mobileOpen' : 'open'}
            exit={isMobile ? 'mobileClosed' : 'closed'}
          >
            {/* Logo */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
              <Image
                src="/logo-long-full.svg"
                alt="Swinburne University of Technology"
                width={180}
                height={60}
                className="object-contain"
              />
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sidebar Items */}
            <nav className="flex-1 space-y-2 overflow-y-auto">
              {sidebarItems.map((item) => (
                <div key={item.name}>
                  <button
                    onClick={() => item.href === '/admin/dashboard' ? router.push(item.href) : toggleDropdown(item.href)}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ease-in-out ${
                      activeItem === item.href
                        ? 'bg-red-600 text-white shadow-md'
                        : hoveredItem === item.name
                        ? 'bg-red-50 text-red-600'
                        : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    {item.name}
                    {item.dropdown && (
                      <ChevronDownIcon
                        className={`h-5 w-5 ml-auto transition-transform duration-200 ${
                          activeItem === item.href ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>
                  <AnimatePresence>
                    {item.dropdown && activeItem === item.href && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="ml-8 space-y-1 mt-1 overflow-hidden"
                      >
                        {item.dropdown.map((subItem) => (
                          <a
                            key={subItem}
                            href={`${item.href}/${subItem.toLowerCase().replace(/\s+/g, '-')}`}
                            className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                          >
                            {subItem}
                          </a>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Bottom Items */}
            <div className="border-t border-gray-200 pt-4 space-y-2 shrink-0">
              <a
                href="/settings"
                className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out"
              >
                <CogIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                Settings
              </a>
              <LogoutButton
                className="flex items-center p-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out w-full text-left"
                showIcon={true}
                text="Log Out"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          !isMobile && isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Top Bar */}
        <motion.div
          className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10"
          animate={{ y: isTopBarVisible ? 0 : '-100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-red-600 hover:text-red-800"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            {!isMobile && (
              <div className="relative flex-1 max-w-lg">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 w-full"
                />
              </div>
            )}
          </div>
          {isMobile ? (
            <Image
              src="/logo-long-full.svg"
              alt="Swinburne University of Technology"
              width={120}
              height={40}
              className="object-contain"
            />
          ) : (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-red-600"
              >
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden md:inline">{session?.name || 'User'}</span>
                <ChevronDownIcon className="h-5 w-5" />
              </button>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg"
                >
                  {profileItems.map((item) =>
                    item.name === 'Log Out' ? (
                      <LogoutButton
                        key={item.name}
                        className="flex items-center p-2 text-gray-700 hover:bg-red-100 hover:text-red-600 w-full text-left"
                        showIcon={true}
                        text="Log Out"
                      />
                    ) : (
                      <a
                        key={item.name}
                        href={item.href}
                        className="flex items-center p-2 text-gray-700 hover:bg-red-100 hover:text-red-600"
                      >
                        <item.icon className="h-5 w-5 mr-2" />
                        {item.name}
                      </a>
                    )
                  )}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Profile Content */}
        <main className="p-6 flex-grow">
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
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAuthenticated } from '@azure/msal-react'
import { useSession } from '@/components/SessionProvider'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import LogoutButton from '@/components/LogoutButton'
import {
  PencilIcon,
  PlusIcon,
  Bars3Icon,
  UserCircleIcon,
  CogIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

interface Staff {
  staff_id: string
  name: string
  email: string
  mobile_no: string
  department_id: string
  microsoft_user_id: string
  created_dt: string
  updated_dt: string
}

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
  { name: 'Log Out', icon: UserCircleIcon, href: '/logout' },
]

const sidebarVariants = {
  open: { x: 0, opacity: 1, width: '16rem', transition: { duration: 0.3, ease: 'easeInOut' } },
  closed: { x: -250, opacity: 0, width: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
  mobileOpen: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
  mobileClosed: { y: '-100%', opacity: 0, transition: { duration: 0.3, ease: 'easeInOut' } },
}

export default function AddStaffPage() {
  const isAuthenticated = useIsAuthenticated()
  const { session, isLoading: sessionLoading } = useSession()
  const router = useRouter()

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<string | null>('/staff')
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isTopBarVisible, setIsTopBarVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    staff_id: '',
    name: '',
    email: '',
    mobile_no: '',
    department_id: '',
    microsoft_user_id: ''
  })

  // Staff list state
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

  // Fetch staff list
  useEffect(() => {
    if (isAuthenticated && session) {
      fetchStaffList()
    }
  }, [isAuthenticated, session])

  const fetchStaffList = async () => {
    try {
      const response = await fetch('/api/staff/list', {
        method: 'GET'
      })
      const data = await response.json()
      if (data.success) {
        setStaffList(data.staff || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.staff_id || !formData.name || !formData.email ||
        !formData.mobile_no || !formData.department_id || !formData.microsoft_user_id) {
      alert('All fields are required!')
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = editingStaff ? '/api/staff/update' : '/api/staff/add'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        alert(editingStaff ? 'Staff updated successfully!' : 'Staff added successfully!')
        // Reset form
        setFormData({
          staff_id: '',
          name: '',
          email: '',
          mobile_no: '',
          department_id: '',
          microsoft_user_id: ''
        })
        setEditingStaff(null)
        // Refresh staff list
        fetchStaffList()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error submitting staff:', error)
      alert('Failed to submit staff data')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff)
    setFormData({
      staff_id: staff.staff_id,
      name: staff.name || '',
      email: staff.email || '',
      mobile_no: staff.mobile_no || '',
      department_id: staff.department_id || '',
      microsoft_user_id: staff.microsoft_user_id || ''
    })
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingStaff(null)
    setFormData({
      staff_id: '',
      name: '',
      email: '',
      mobile_no: '',
      department_id: '',
      microsoft_user_id: ''
    })
  }

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

  // Show loading while session is loading
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !session) {
    router.push('/')
    return null
  }

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

        {/* Main Content Area */}
        <main className="p-6 flex-grow">
          <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-2">Add new staff members or edit existing ones</p>
        </div>

        {/* Add/Edit Staff Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="staff_id"
                value={formData.staff_id}
                onChange={handleInputChange}
                disabled={!!editingStaff}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 disabled:bg-gray-100"
                placeholder="e.g., S001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="e.g., john@swin.edu.my"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="mobile_no"
                value={formData.mobile_no}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="e.g., 0123456789"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="department_id"
                value={formData.department_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="e.g., IT"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microsoft User ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="microsoft_user_id"
                value={formData.microsoft_user_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="e.g., d5a79a53-4635-4cb7-8b57-3a586f6cb9c9"
                required
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {isSubmitting ? 'Submitting...' : (editingStaff ? 'Update Staff' : 'Add Staff')}
              </button>

              {editingStaff && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Staff List Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Staff List</h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading staff list...</div>
            ) : staffList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No staff members found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Microsoft ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffList.map((staff) => (
                    <tr key={staff.staff_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{staff.staff_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.mobile_no || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{staff.department_id || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={staff.microsoft_user_id || 'N/A'}>
                          {staff.microsoft_user_id || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(staff)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
          </div>
        </main>
      </div>
    </div>
  )
}

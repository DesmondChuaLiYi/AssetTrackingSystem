'use client'

import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import Breadcrumb from '@/components/ui/breadcrumb'

import {
  PencilIcon,
  PlusIcon
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

export default function AddStaffPage() {
  const { session, isLoading: sessionLoading } = useAdminAccess()
  // const router = useRouter()
  const breadcrumbItems = [
    { label: 'Home', href: '/admin/dashboard', isClickable: true },
    { label: 'Staff', href: '/admin/staff/List', isClickable: true },
    { label: 'List', href: '', isClickable: false }
  ]

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
    if (session) {
      fetchStaffList()
    }
  }, [session])

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
          <Breadcrumb customItems={breadcrumbItems} />
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
  )
}
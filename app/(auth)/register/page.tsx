'use client'

// Registration page — collects Staff ID (user-provided integer), name, email, mobile, department.
// Staff ID is the Swinburne staff number (digits only). Validated inline and checked for duplicates before submit.
// Department is a dropdown fetched from the Department table — prevents invalid/free-text department entries.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface Department {
  department_id: string
  name: string
}

// Regex: only digits, no letters or symbols
const STAFF_ID_REGEX = /^\d+$/
// Regex: block common injection/sensitive characters in text fields
const SENSITIVE_CHARS_REGEX = /[<>"'`;\\]/

export default function RegisterPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])

  // Fetch department list on mount for the dropdown
  useEffect(() => {
    fetch('/api/department/public')
      .then(res => res.json())
      .then(data => { if (data.data) setDepartments(data.data) })
      .catch(() => {}) // If fetch fails, dropdown will be empty
  }, [])

  const [formData, setFormData] = useState({
    staff_id: '',
    name: '',
    email: '',
    mobile_no: '',
    department_id: ''
  })

  // Per-field inline validation error messages shown as user types
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Check Staff ID uniqueness against the API
  const checkStaffIdExists = async (staffId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/auth/check-staff-id?staff_id=${encodeURIComponent(staffId)}`)
      const data = await res.json()
      return data.exists === true
    } catch {
      return false
    }
  }

  // Check email uniqueness against the API
  const checkEmailExists = async (email: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      return data.message ?? null // null means no conflict
    } catch {
      return null
    }
  }

  const validateStaffId = (value: string): string => {
    if (!value) return ''
    if (SENSITIVE_CHARS_REGEX.test(value)) return 'Staff ID must not contain special characters.'
    if (!STAFF_ID_REGEX.test(value)) return 'Staff ID must contain digits only (no letters or symbols).'
    if (value.length > 30) return 'Staff ID cannot exceed 30 characters.'
    return ''
  }

  const validateEmail = (value: string): string => {
    if (!value) return ''
    if (SENSITIVE_CHARS_REGEX.test(value)) return 'Email must not contain special characters like < > " \' ; \\'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Invalid email format.'
    if (value.length > 60) return 'Email cannot exceed 60 characters.'
    return ''
  }

  // Filter out sensitive chars on every keystroke for staff_id; allow only digits
  const handleStaffIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip any non-digit characters immediately so sensitive symbols can't be typed
    const cleaned = e.target.value.replace(/\D/g, '')
    const error = validateStaffId(cleaned)
    setFormData(prev => ({ ...prev, staff_id: cleaned }))
    setFieldErrors(prev => ({ ...prev, staff_id: error }))
  }

  // For email, warn inline on each change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Block sensitive chars at input level
    const filtered = e.target.value.replace(/[<>"'`;\\]/g, '')
    const error = validateEmail(filtered)
    setFormData(prev => ({ ...prev, email: filtered }))
    setFieldErrors(prev => ({ ...prev, email: error }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Async blur handlers to check duplicates from DB
  const handleStaffIdBlur = async () => {
    const { staff_id } = formData
    const syncError = validateStaffId(staff_id)
    if (syncError) { setFieldErrors(prev => ({ ...prev, staff_id: syncError })); return }
    if (!staff_id) return
    const exists = await checkStaffIdExists(staff_id)
    if (exists) {
      setFieldErrors(prev => ({ ...prev, staff_id: 'This Staff ID is already registered.' }))
    }
  }

  const handleEmailBlur = async () => {
    const { email } = formData
    const syncError = validateEmail(email)
    if (syncError) { setFieldErrors(prev => ({ ...prev, email: syncError })); return }
    if (!email) return
    const message = await checkEmailExists(email)
    if (message) {
      setFieldErrors(prev => ({ ...prev, email: message }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Final client-side guard before sending
    if (!formData.staff_id || !formData.name || !formData.email || !formData.mobile_no || !formData.department_id) {
      alert('All fields are required!')
      return
    }
    if (Object.values(fieldErrors).some(err => err !== '')) {
      alert('Please fix the errors before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(`Registration submitted successfully!\n\nYour Staff ID: ${data.staff.staff_id}\n\nPlease wait for admin approval. You will be able to login once approved.`)

        setFormData({ staff_id: '', name: '', email: '', mobile_no: '', department_id: '' })
        setFieldErrors({})

        setTimeout(() => { router.push('/') }, 2000)
      } else {
        alert(`Registration failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('Failed to submit registration. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo-long-full.svg"
              alt="Swinburne University of Technology"
              width={180}
              height={60}
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Staff Registration</h1>
          <p className="text-gray-600 text-sm">Register for Asset Tracking System access</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Staff ID — user-provided integer, shown first */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff ID <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              name="staff_id"
              value={formData.staff_id}
              onChange={handleStaffIdChange}
              onBlur={handleStaffIdBlur}
              maxLength={30}
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent ${fieldErrors.staff_id ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., 12345"
              required
            />
            {fieldErrors.staff_id && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.staff_id}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Digits only — your Swinburne staff ID number.</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={60}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              maxLength={60}
              className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent ${fieldErrors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., john@swin.edu.my"
              required
            />
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Use your Swinburne email address.</p>
            )}
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number <span className="text-red-600">*</span>
            </label>
            <input
              type="tel"
              name="mobile_no"
              value={formData.mobile_no}
              onChange={handleInputChange}
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="e.g., 0123456789"
              required
            />
          </div>

          {/* Department — dropdown from Department table */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department <span className="text-red-600">*</span>
            </label>
            <select
              name="department_id"
              value={formData.department_id}
              onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white"
              required
            >
              <option value="">Select a department</option>
              {departments.map(dept => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After submitting your registration, an administrator will review and approve your request. You will be able to login once approved.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-red-600 hover:text-red-700 font-medium">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/breadcrumb'

interface FormFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface DynamicAddConfig {
  entityName: string
  entityDisplayName: string
  entityDisplayNameSingular: string
  apiEndpoint: string
  primaryKey: string
  formFields: FormFieldConfig[]
  pageTitle: string
  backUrl: string
}

interface DynamicAddProps {
  config: DynamicAddConfig
}

export default function DynamicAdd({ config }: DynamicAddProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState<any>({})
  const [relatedData, setRelatedData] = useState<{
    locations: any[],
    departments: any[]
  }>({ locations: [], departments: [] })
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted && !session) {
      router.push('/')
    }
  }, [mounted, session, router])

  // Initialize form data
  useEffect(() => {
    const initialFormData: any = {}
    config.formFields.forEach(field => {
      if (field.type === 'select' && field.options && field.options.length > 0) {
        initialFormData[field.key] = field.options[0].value
      } else {
        initialFormData[field.key] = ''
      }
    })
    setFormData(initialFormData)
  }, [config])

  // Load related data (locations and departments)
  useEffect(() => {
    if (mounted && session) {
      loadRelatedData()
    }
  }, [mounted, session])

  const loadRelatedData = async () => {
    try {
      // Fetch locations
      const locationsRes = await fetch('/api/location?page=1&limit=1000')
      const locationsData = await locationsRes.json()

      // Fetch departments
      const departmentsRes = await fetch('/api/department?page=1&limit=1000')
      const departmentsData = await departmentsRes.json()

      setRelatedData({
        locations: locationsData.data || [],
        departments: departmentsData.data || []
      })
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: { [key: string]: any }) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create a copy of the form data
      const submissionData = { ...formData }

      // Handle empty location_id and department_id
      if (!submissionData.location_id || submissionData.location_id === '') {
        submissionData.location_id = null
      }
      if (!submissionData.department_id || submissionData.department_id === '') {
        submissionData.department_id = null
      }

      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })

      const result = await response.json()

      if (response.ok) {
        alert(`${config.entityDisplayNameSingular} added successfully!`)
        router.push(config.backUrl)
      } else {
        alert(`Error: ${result.error || 'Failed to add record'}`)
      }
    } catch (error) {
      console.error('Error adding record:', error)
      alert('Failed to add record. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: FormFieldConfig) => {
    const value = formData[field.key] || ''

    if (field.type === 'select') {
      let options = field.options || []

      // For location_id field, use locations from relatedData
      if (field.key === 'location_id' && relatedData.locations.length > 0) {
        options = [
          { value: '', label: 'Select Location' },
          ...relatedData.locations.map(location => ({
            value: location.location_id,
            label: location.name
          }))
        ]
      }

      // For department_id field, use departments from relatedData
      if (field.key === 'department_id' && relatedData.departments.length > 0) {
        options = [
          { value: '', label: 'Select Department' },
          ...relatedData.departments.map(department => ({
            value: department.department_id,
            label: department.name
          }))
        ]
      }

      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows={3}
          required={field.required}
        />
      )
    }

    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => handleInputChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        required={field.required}
      />
    )
  }

  if (!mounted || !session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <Breadcrumb />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Add {config.entityDisplayNameSingular}</h1>
            <p className="text-gray-600 mt-1">Create a new {config.entityDisplayNameSingular.toLowerCase()} record</p>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {config.formFields.map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push(config.backUrl)}
                  className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : `Add ${config.entityDisplayNameSingular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
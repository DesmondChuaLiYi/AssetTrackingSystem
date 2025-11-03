'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/SessionProvider'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'

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
  const { session } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState<any>({})
  const [relatedData, setRelatedData] = useState<{ [key: string]: any[] }>({})
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
      if (field.type === 'select') {
        initialFormData[field.key] = field.options?.[0]?.value || ''
      } else {
        initialFormData[field.key] = ''
      }
    })
    setFormData(initialFormData)
  }, [config])

  // Load related data for select fields
  useEffect(() => {
    if (mounted && session) {
      loadRelatedData()
    }
  }, [mounted, session])

  const loadRelatedData = async () => {
    const selectFields = config.formFields.filter(field => 
      field.type === 'select' && !field.options && field.key.endsWith('_id')
    )

    for (const field of selectFields) {
      try {
        let endpoint = ''
        if (field.key === 'location_id') endpoint = '/api/location'
        else if (field.key === 'department_id') endpoint = '/api/department'
        
        if (endpoint) {
          const response = await fetch(endpoint)
          const data = await response.json()
          if (data.success) {
            setRelatedData(prev => ({
              ...prev,
              [field.key]: data.data
            }))
          }
        }
      } catch (error) {
        console.error(`Error loading ${field.key} data:`, error)
      }
    }
  }

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: { [key: string]: any }) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`${config.entityDisplayNameSingular} added successfully!`)
        router.push(config.backUrl)
      } else {
        alert(`Error: ${result.error}`)
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
      
      // Use related data for foreign key fields
      if (field.key.endsWith('_id') && relatedData[field.key]) {
        const keyField = field.key === 'location_id' ? 'location_id' : 
                        field.key === 'department_id' ? 'department_id' : 'id'
        options = relatedData[field.key].map(item => ({
          value: item[keyField],
          label: item.name
        }))
      }

      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          required={field.required}
        >
          <option value="">Select {field.label}</option>
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

  const breadcrumbItems = [
    { label: 'Home', href: '/admin/dashboard', isClickable: true },
    { label: config.entityDisplayName, href: config.backUrl, isClickable: true },
    { label: `Add ${config.entityDisplayNameSingular}`, href: '', isClickable: false }
  ]

  if (!mounted || !session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Breadcrumb customItems={breadcrumbItems} />
        
        <div className="mt-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Add {config.entityDisplayNameSingular}
                </h1>
              </div>
            </div>

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
      </div>
    </div>
  )
}
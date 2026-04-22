// components\dynamicEdit.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file dynamicEdit.tsx
 * @description A reusable dynamic component to edit forms, for assets, locations and departments
 * 
 * This component accepts a config object and a record id, then it fetches an existing record
 * from the API, and pre-fills the form fields. To save, it submits a PUT request on save.
 * 
 * It is the edit counterpart to dynamicAdd.tsx where we have the same config object shape
 * Just that this dynamic component works for editing form and fields
 */
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/breadcrumb'

// ----------------- Configuration for a single form field in edit form -----------------
interface formFieldConfig {
  // Database column name - used as the key in formData and the PUT body
  key: string
  // Human-readable label shown above the input
  label: string
  // Determine which HTML element is rendered for this field
  type: 'text' | 'textarea' | 'select' | 'number'
  // Whether the field is required (red asterisk)
  required?: boolean
  // Static options for a select field
  options?: { value: string; label: string }[]
  // Placeholder text shown when an input field is empty
  placeholder?: string
  // Whether the field is read-only
  disabled?: boolean
}

// ------------------ The configuration object passed to dynamicEdit ------------------
// Exported so that other edit page files can use their config objects
export interface dynamicEditConfig {
  // Short internal name for logging, e.g., 'asset'
  entityName: string
  // Plural display name, e.g., 'Assets'
  entityDisplayName: string
  // Singular display name, e.g., 'Asset'
  entityDisplayNameSingular: string
  // Base API endpoint, e.g., '/api/assets'
  apiEndpoint: string
  // Primary key field name, e.g., 'asset_id'
  primaryKey: string
  // Ordered list of form fields to render in the dynamicEdit page
  formFields: formFieldConfig[]
  // Page heading shown at the top
  pageTitle: string
  // URL to redirect to on save or cancel
  backUrl: string
}

// ---------------------- Props accepted by the dynamicEdit component ------------------
interface dynamicEditProps {
  // Describes the fields to show, the API endpoint, labels and etc.
  config: dynamicEditConfig
  // The primary key value from the URL - used to fetch and update the record
  recordId: string
}

// ----------- Shape of the data loaded from the API and stored in formData ----------------
// Using Record<string, unknown> instead of any enforces that we check
// the type before using any value
type editFormData = Record<string, unknown>

// -------- Shape of the related dropdown data fetched for location_id and department_id fields ------
interface relatedData {
  location_id: {
    location_id: string;
    name: string
  } []

  department_id: {
    department_id: string;
    name: string
  } []
}

/** ---------------- Export the dynamicEdit page component ----------------------
 * Rendered by page-level edit pages (e.g., editAsset/[id]/page.tsx) which pass
 * in a dynamicEditConfig and the record ID from the URL 
 * @param config - Describes the form fields, API endpoints and redirect URL
 * @param recordId - The primary key value of the record to edit, fetched from the URL
 * */
export default function dynamicEdit({ config, recordId }: dynamicEditProps) {
  const { status } = useSession()
  const router = useRouter()
  
  // formData - the live state of all form inputs
  // Initially empty but gets populated by loadRecord() from the API
  const [formData, setFormData] = useState<editFormData>({})

  // relatedData - holds the fetched locations and departments for dropdown fields
  const [relatedData, setRelatedData] = useState<relatedData>({
    location_id: [],
    department_id: []
  })

  // True while the PUT request is fetching - disables the save button
  const [loading, setLoading] = useState(false)

  // True while the initial GET request is loading the existing record
  const [loadingData, setLoadingData] = useState(true)

  // Prevents SSR or hydration mismatches by delaying render until client-side is ready
  const [mounted, setMounted] = useState(false)

  // Mount flag
  // Prevents any code that reads browser APIs (window, localStorage) from
  // running during server-side rendering, which can cause a hydration error
  useEffect(() => setMounted(true), [])

  // ------------------ Auth guard ----------------------
  useEffect(() => {
    // If the user is not authenticated, redirect back to login
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // ------------------- Load existing record and related data when ready --------------
  useEffect(() => {
    if (mounted && status === 'authenticated' && recordId) {
      loadRecord()
      loadRelatedData()
    }
  }, [mounted, status, recordId])

  // ------------------- loadRecord : Fetches the existing record from API ---------------
  // Calls GET /api/{entity}/{recordId}
  // On success: populates formData with the response
  // On failure: show an error alert and redirect the user back to the listing page
  // Special case: if the asset has no condition set (old record), default to 'In-use'
  // so the select dropdown has a valid initial value
  const loadRecord = async () => {
    try {
      const response = await fetch(`${config.apiEndpoint}/${recordId}`)
      // Fetch the data using the API then store it
      const result = await response.json()

      // If data fetched successfully
      if (result.success) {
        const data = result.data
        // Default condition to 'In-use' for assets if it's not already set
        if (config.entityName === 'asset' && !data.condition) {
          data.condition = 'In-use'
        }
        // Populate the fields with data
        setFormData(data)
      } else {
        // If fail to load record
        alert('Error loading record')
        // Return to the listing page URL
        router.push(config.backUrl)
      }
    } catch (error) {
      // Catch errors
      console.error('Error loading record:', error)
      alert('Failed to load record')
      // Return to listing page URL
      router.push(config.backUrl)
    } finally {
      // Stop the loading spinner even though there was an error
      setLoadingData(false)
    }
  }


  // ----------------- loadRelatedData : Fetch locations and departments for dropdown fields ---------
  const loadRelatedData = async () => {
    try {
      // Commented by Desmond @ 22-April-26
      // Combined so that both requests fire at the same time - wait for both to finish
      const [locationsRes, departmentsRes] = await Promise.all([
        fetch('/api/location?page=1&limit=100'),
        fetch('/api/department?page=1&limit=100')
      ])

      const [locationsData, departmentsData] = await Promise.all([
        locationsRes.json(),
        departmentsRes.json()
      ])
      // Fetch locations
      // const locationsRes = await fetch('/api/location?page=1&limit=100')
      // const locationsData = await locationsRes.json()

      // Fetch departments
      // const departmentsRes = await fetch('/api/department?page=1&limit=100')
      // const departmentsData = await departmentsRes.json()

      setRelatedData({
        // If error or null, then default to empty
        location_id: locationsData.data ?? [],
        department_id: departmentsData.data ?? []
      })
    } catch (error) {
      // Log error message when related data failed to load
      console.error('[dynamicEdit] Error loading related data:', error)
    }
  }

  // ------------ renderField : Render the correct input element for each field type -------------------
  // Handles text inputs, text areas, select dropdowns
  // Disabled fields get a grey background and cursor not allowed
  const renderField = (field: formFieldConfig) => {
    const value = formData[field.key] ?? ''
    // The field is disabled if the field is explicit disabled
    // Or, the field is primary key
    const isDisabled = field.disabled || field.key === config.primaryKey

    // Commented by Desmond @ 22-April-26
    // -------------------------------------------------------------------------------------------------------------------------------------
    // -                     This is the BASE class for the input fields, change the attributes like column WIDTH here                     -
    // -------------------------------------------------------------------------------------------------------------------------------------
    const baseClass = `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${
      isDisabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''
    }`

    // -------------------------- Select ----------------------------
    if (field.type === 'select') {
      // Fill in the options with the provided field, otherwise null then empty
      let options = field.options ?? []

      // Replace static empty options with live db data for location_id
      // For location_id field, use locations from relatedData
      if (field.key === 'location_id' && relatedData.location_id?.length > 0) {
        options = [
          // Label for select field
          { value: '', label: 'Select Location' },
          // Map the attributes to the correct fields
          ...relatedData.location_id.map(location => ({
            // location_id
            value: location.location_id,
            // location name
            label: location.name
          }))
        ]
      }

      // Replace static empty options with live db data for department_id
      // For department_id field, use departments from relatedData
      if (field.key === 'department_id' && relatedData.department_id?.length > 0) {
        options = [
          // Label for select field
          { value: '', label: 'Select Department' },
          // Map the attributes to the correct fields
          ...relatedData.department_id.map(department => ({
            // department_id
            value: department.department_id,
            // department name
            label: department.name
          }))
        ]
      }

      // ---------------------- Render the select (dropdown) field -------------------------
      return (
        // ------------ Select --------------
        <select
          id={field.key}
          value={String(value)}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          disabled={isDisabled} // Disabled if explicitly mentioned, or this is a primary key
          className={baseClass} // Style follows the baseClass, refer above
          required={field.required}
        >
          {options.map(option => (
            // -------------- Option ----------------
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    // ----------------------- Text area ----------------------------
    if (field.type === 'textarea') {
      return (
        <textarea
          id={field.key}
          value={String(value)}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          disabled={isDisabled} // Disabled if explicitly mentioned, or this is a primary key
          placeholder={field.placeholder}
          className={baseClass} // Style follows the baseClass, refer above
          rows={3}
          required={field.required}
        />
      )
    }

    // --------------------- Text / Number input ----------------------
    return (
      <input
        id={field.key}
        type={field.type === 'number' ? 'number' : 'text'}
        value={String(value)}
        onChange={(e) => handleInputChange(field.key, e.target.value)}
        disabled={isDisabled} // Disabled if explicitly mentioned, or this is a primary key
        placeholder={field.placeholder}
        className={baseClass} // Style follows the baseClass, refer above
        required={field.required}
      />
    )
  }

  // -------------------- handleInputChange : Update a single field in formData ----------------------
  const handleInputChange = (key: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [key]: value}))
  }

  // ------------------- handleSubmit : Sends the updated record to the API --------------------
  // 1. Prevent double-submit while setLoading(true)
  // 2. Clean formData - remove join objects (location, department)
  // 3. Supabase rejects "" for FK columns
  // 4. PUT /api/{entity}/{recordId}
  // 5. Redirect on success
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent the default form from being submitted
    e.preventDefault()
    setLoading(true)

    try {
      // Strip join objects
      // The GET response contains { location: { name: '...' }, department: { name: '...' } }
      // These nested objects must be removed before sending the PUT body —
      // the server expects only flat column values, not nested related objects
      const cleanedData = { ...formData }

      // Remove nested objects
      delete cleanedData.location
      delete cleanedData.department

      // Convert empty FK strings to null
      // Ensure proper typing for IDs
      if (cleanedData.location_id === '') {
        cleanedData.location_id = null
      }

      // Handle department_id (string type)
      if (cleanedData.department_id === '') {
        cleanedData.department_id = null
      }

      // Send the PUT request
      const response = await fetch(`${config.apiEndpoint}/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      })

      // Store the result
      const result = await response.json()

      if (result.success) {
        // Alert the user when record updated successfully
        alert(`${config.entityDisplayNameSingular} updated successfully!`)
        // Redirect on success
        router.push(config.backUrl)
      } else {
        // Output the error
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      // Log the errors to console
      console.error('Error updating record:', error)
      alert('Failed to update record. Please try again.')
    } finally {
      // Stops the loading even though the process failed
      setLoading(false)
    }
  }

  // ----------------- Guard states : Shown before the form renders --------------------
  // Prevent rendering until mounted (avoids server/client HTML mismatch)
  if (!mounted || status === 'loading') {
    return null
  }

  // Form will not be rendered for unauthenticated users
  if (status === 'unauthenticated') {
    return null
  }

  //  --------------- While record is being fetched, show the loading spinner -----------------
  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // -------------------------- Render the main page component ---------------------------
  return (
    <div className="min-h-screen bg-white">
      <main className="p-6">
        {/* Here you can change how big the layout is */}
        <div className="w-full mx-auto">
          {/* Breadcrumb component */}
          <Breadcrumb />

          {/* Title card */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit {config.entityDisplayNameSingular}</h1>
            <p className="text-gray-600 mt-1">Update {config.entityDisplayNameSingular.toLowerCase()} details</p>
          </div>

          {/* Edit page form */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="p-6">
              {/* Form fields */}
              <div className="space-y-6">
                {config.formFields.map((field) => (
                  <div key={field.key}>

                    {/* Field label */}
                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>

                    {/* Form fields */}
                    <div className="mt-1">
                      {renderField(field)}
                    </div>

                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex justify-end space-x-3">
                {/* Cancel */}
                <button
                  type="button"
                  onClick={() => router.push(config.backUrl)}
                  className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : `Save ${config.entityDisplayNameSingular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
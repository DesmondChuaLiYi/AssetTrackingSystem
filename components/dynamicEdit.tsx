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
  // Maximum length allowed for the field (database constraint)
  maxLength?: number 
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
  location_id: { location_id: string; name: string } []
  department_id: { department_id: string; name: string } []
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
  const [relatedData, setRelatedData] = useState<relatedData>({ location_id: [], department_id: [] })
  
  // Client-side validation errors from validateField()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
    if (status === 'unauthenticated') router.push('/')
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


  /** Commented by Desmond @ 18-May-26 --------------------------------------------------------
   *                        Form validation (Regex - regular expression)
   * ---------------------------------------------------------------------------------------- */
  // BUGFIX 29-April Daryl: Strict Regex for IDs, Names, Models, etc. (Bans @, ., -, etc.)
  // BUGFIX 25-April: Strict Regex (Bans @, ., -, \, etc.) Hyphen is at the very end to work properly.
  const STRICT_INVALID_CHARS_REGEX = /[@!#%^&*()<>_{}=+|~/?;:'"\\.,]/

  // BUGFIX 07-May: Daryl: Lenient Regex for Descriptions (Allows uppercase letters)
  // BUGFIX 29-April Daryl: Lenient Regex for Descriptions (Allows spaces, periods, and commas)
  // BUGFIX 25-April: Lenient Regex for Descriptions (Allows spaces, periods, commas, and hyphens)
  const DESC_INVALID_CHARS_REGEX = /[@!#%^&*()<>_{}|=+~/?;:'"\\]/

  // BUGFIX 29-April Daryl: Standard Email Format Validation
  // BUGFIX 25-April: Standard Email Format Validation
  const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // BUGFIX 29-April Daryl: Standard Mobile Format (Allows optional + at start, then digits)
  // BUGFIX 25-April: Standard Mobile Format (Allows optional + at start, then digits)
  const MOBILE_FORMAT_REGEX = /^\+?[0-9]{8,15}$/

  const validateField = (value: string | number | null, fieldConfig: formFieldConfig) => {
    if (value === null || value === '') return null;
    
    const strVal = String(value);

    // 1. Level Logic (Must be integers and cannot be less than 0)
    if (fieldConfig.key.toLowerCase() === 'level') {
      const LEVEL_REGEX = /^[0-9]+$/
      if (!LEVEL_REGEX.test(strVal)) {
        return 'Invalid: Level can only be numbers (e.g., 0, 1, 2).'
      }

    // 2. Number Input Logic (Primarily used for Level in Locations)
    } else if (fieldConfig.type === 'number') {
      const num = Number(value)

      if (isNaN(num)) {
        return 'Invalid: Must be a number.'
      }

      if (num < 0) {
        return 'Invalid: Value must be less than 0.'
      }

      if (num > 20) {
        return 'Invalid: Value is too large.'
      }

    // 3. Email Logic
    } else if (fieldConfig.key.toLowerCase().includes('email')) {
      if (!EMAIL_FORMAT_REGEX.test(strVal)) {
        return 'Invalid: Please enter a valid email address.'
      }

    // 4. Mobile/Phone Logic
    } else if (fieldConfig.key.toLowerCase().includes('mobile') || fieldConfig.key.toLowerCase().includes('phone')) {
      if (!MOBILE_FORMAT_REGEX.test(strVal)) {
        return 'Invalid: Mobile number must contain only numbers.'
      }

    // 5. Description/Textarea Logic (Lenient)
    } else if (fieldConfig.type === 'textarea' || fieldConfig.key.toLowerCase().includes('desc')) {
      if (DESC_INVALID_CHARS_REGEX.test(strVal)) {
        return 'Invalid: Contains sensitive special characters.'
      }

    // 6. Standard Text Input Logic (Strict)
    } else if (fieldConfig.type === 'text') {
      if (STRICT_INVALID_CHARS_REGEX.test(strVal)) {
        return 'Invalid: Contains sensitive special characters. Symbols like ' +
               '@, ., and - are not allowed here.'
      }
    }
    
    // Character Limit Check
    if (fieldConfig.maxLength && strVal.length > fieldConfig.maxLength) {
      return `Exceeds database maximum length of ${fieldConfig.maxLength} characters.`;
    }

    return null
  }

  // ------------ renderField : Render the correct input element for each field type -------------------
  // Handles text inputs, text areas, select dropdowns
  // Disabled fields get a grey background and cursor not allowed
  const renderField = (field: formFieldConfig) => {
    const value = formData[field.key] ?? ''
    // The field is disabled if the field is explicit disabled
    // Or, the field is primary key
    const isDisabled = field.disabled || field.key === config.primaryKey
    const hasError = !!validationErrors[field.key]
    const isLevel = field.key.toLowerCase() === 'level'

    // Commented by Desmond @ 22-April-26
    // -------------------------------------------------------------------------------------------------------------------------------------
    // -                     This is the BASE class for the input fields, change the attributes like column WIDTH here                     -
    // -------------------------------------------------------------------------------------------------------------------------------------
    const baseClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm ${
      isDisabled ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-300' :
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300' 
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
            <option key={option.value} value={option.value}>{option.label}</option>
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
          rows={10} 
          required={field.required} 
          maxLength={field.maxLength} 
        />
      )
    }

    // BUGFIX 25-April: Switch type='number' to type='text' but force numeric input via JS. 
    // This stops HTML from automatically accepting 'e', '.', or '-' inside number inputs.
    // BUGFIX: We force type="text" globally so HTML doesn't block the letter "G" in the Level field.
    // --------------------- Text / Number input ----------------------
    return (
      <input 
        id={field.key} 
        type="text" 
        inputMode={field.type === 'number' && !isLevel ? 'numeric' : 'text'}
        value={String(value)} 
        onChange={(e) => handleInputChange(field.key, e.target.value)} 
        disabled={isDisabled} // Disabled if explicitly mentioned, or this is a primary key
        placeholder={field.placeholder} 
        className={baseClass} // Style follows the baseClass, refer above
        required={field.required} 
        maxLength={field.maxLength} 
      />
    )
  }

  // -------------------- handleInputChange : Update a single field in formData ----------------------
  const handleInputChange = (key: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [key]: value}))

    // Run client-side validation on the changed field
    const fieldConfig = config.formFields.find(f => f.key === key)
    if (fieldConfig) {
      const error = validateField(value, fieldConfig)

      setValidationErrors(prev => {
        const newErrors = { ...prev }

        if (error) {
          newErrors[key] = error
        } else {
          delete newErrors[key]
        } 

        return newErrors
      })
    }
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
      if (cleanedData.location_id === '') cleanedData.location_id = null
      if (cleanedData.department_id === '') cleanedData.department_id = null

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
  if (!mounted || status === 'loading') return null

  // Form will not be rendered for unauthenticated users
  if (status === 'unauthenticated') return null

  // --------------- While record is being fetched, show the loading spinner -----------------
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

  // Check if there are any client-side validation errors
  const hasClientErrors = Object.keys(validationErrors).length > 0;

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

                    {/* Field label with character counter */}
                    <div className="flex justify-between items-end mb-1">
                      <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {/* Character counter for text/textarea fields */}
                      {(field.type === 'text' || field.type === 'textarea') && field.maxLength && (
                        <span className={`text-xs font-medium ${String(formData[field.key] || '').length > field.maxLength ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                          {String(formData[field.key] || '').length} / {field.maxLength}
                        </span>
                      )}
                    </div>

                    {/* Validation error message */}
                    {validationErrors[field.key] && (
                      <p className="mb-1 text-sm font-semibold text-red-600" role="alert">
                        {validationErrors[field.key]}
                      </p>
                    )}

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

                {/* Submit - disabled while loading or if there are validation errors */}
                <button 
                  type="submit" 
                  disabled={loading || hasClientErrors} 
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
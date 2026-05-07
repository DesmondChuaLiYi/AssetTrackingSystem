// components/dynamicAdd.tsx
'use client'

/** Commented by Desmond @ 13-April-26
 * @file dynamicAdd.tsx
 * @description A reusable dynamic form component for adding records
 * 
 * This component is used for adding assets, locations and departments.
 * It is configured using the 'DynamicAddConfig' passed in by pages like addAsset/page.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import Breadcrumb from '@/components/ui/breadcrumb'
import BarcodePreview from '@/components/ui/barcodePreview'
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

// Types for form fields
interface formFieldConfig {
  key: string // Database column name
  label: string // Label to show on top of input
  type: 'text' | 'textarea' | 'select' | 'number' // Determine the HTML input type
  required?: boolean  // Shows whether the field is required or not
  options?: { value: string; label: string }[] // List of option for select fields
  placeholder?: string // Placeholder text inside the input when input is empty
  maxLength?: number // Maximum character length for the field
}

export interface dynamicAddConfig {
  entityName: string // Name for the entity being used, like asset, department or location
  entityDisplayName: string 
  entityDisplayNameSingular: string
  apiEndpoint: string // API routes to POST the form data, like /api/assets
  primaryKey: string // Primary key for the table used
  formFields: formFieldConfig[] // List of fields to render in the form
  pageTitle: string // Shown at the top of the page
  backUrl: string // URL to go back on save or cancel
}

interface dynamicAddProps {
  config: dynamicAddConfig
}

// Type for the form data
// The keys are the database column names, and values are form inputs
type assetFormData = Record<string, string | number | null>

// Related data fetched for select fields: Location and Department for add asset form
interface relatedData {
  locations: { location_id: string; name: string }[]
  departments: { department_id: string; name: string }[]
}

/** Commented by Desmond @ 13-April-26
 * Live checking the asset_id field for duplicate entries
 * 
 * idle - User hasn't typed anything, or the input field is empty
 * checking - Waiting for /api/assets/check response (checking for duplicate)
 * available - asset_id does not exist in database
 * taken - asset_id already taken and cannot be assigned
 * error - Error while checking, let the server catch it and warn the user
 */
type duplicateCheckResult = 'idle' | 'checking' | 'available' | 'taken' | 'error'

// Zod validation schema for form data, which mirrors the database structure
const ASSET_CONDITIONS = ['In-use', 'In-store', 'Spoiled'] as const

// Client-side validation schema for the add asset form
const assetFormSchema = z.object({
  asset_id: z.string().trim().min(1, 'Asset ID is required').max(30, 'Asset ID must be 30 characters or less'),
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or less',),
  model: z.string().trim().min(1, 'Model is required').max(30, 'Model must be 30 characters or less'),
  description: z.string().trim().max(60, 'Description must be 60 characters or less').optional(),
  category: z.string().trim().min(1, 'Category is required').max(50, 'Category must be 50 characters or less'),
  condition: z.enum(ASSET_CONDITIONS, {
    message: 'Condition must be In-use, In-store or Spoiled'
  }),
  location_id: z.string().trim().max(30).nullable().optional(),
  department_id: z.string().trim().max(30).nullable().optional()
})

/** ---------------------------------------------------------------------------
 * Add more zod schemas here for location and department here in the future...
 * ----------------------------------------------------------------------------/

/** Commented by Desmond @ 13-April-26
 * ---------------------- Duplicate check badge - green tick if available, red error if the id is already taken -----------------------
 * @param status - Current state of the duplicate check
 * @param assetId - The asset ID in the input field (above the barcode preview)
 */
function DuplicateCheckBadge({ status, assetId }: { status: duplicateCheckResult, assetId: string }) {
  // When the input field is empty, nothing is shown
  if (!assetId.trim() || status === 'idle') return null

  // Checking if the asset ID is available
  if (status === 'checking') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-hidden="true" />
          Checking availability...
      </p>
    )
  }

  // The asset ID is not available because it already exists in the system
  if (status === 'taken') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600" role="alert" aria-live="assertive">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Asset ID <code className="mx-1 font-mono">{assetId}</code> already exists. Please choose a different ID.
      </p>
    )
  }

  // The asset ID is available
  if (status === 'available') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-green-600">
        <CheckCircleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        Asset ID is available!
      </p>
    )
  }

  // An error occurred while checking the asset ID
  if (status === 'error') {
    return (
      <p className="mt-1.5 text-xs text-amber-600">
        Could not verify availability - the server will catch duplicates on submit.
      </p>
    )
  }
  // Return null for 'idle' status or unwanted cases
  return null
}

// ------------------- Export the main component - DynamicAdd ------------------------------------
// It renders the form based on the config passed in, and handles form submission, input changes, duplicate checking and related data loading
export default function DynamicAdd({ config }: dynamicAddProps) {
  const { status } = useSession()
  const router = useRouter()

  // formData to store the input values
  const [formData, setFormData] = useState<assetFormData>({})
  
  // relatedData to store the options for select fields - location and department
  const [relatedData, setRelatedData] = useState<relatedData>({ locations: [], departments: [] })
  
  // Display error when related data (location and department dropdown menus) fail to fetch data
  const [relatedError, setRelatedError] = useState<string | null>(null)
  
  // True when the form is submitting, which disables the submit button and show that it is loading
  const [loading, setLoading] = useState(false)
  
  // Debounced value for the barcodePreview - Only update the barcode every 400ms after the user stops typing
  const [barcodeValue, setBarcodeValue] = useState('')
  const [duplicateStatus, setDuplicateStatus] = useState<duplicateCheckResult>('idle')
  
  // Separate refs for the two debounce timer so they can be cancelled independently
  // Stored in refs because they can persist across renders without causing re-renders
  const barcodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const duplicateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Check if the form is for assets by checking if the primary key is 'asset_id'
  const isAssetForm = config.primaryKey === 'asset_id'
  
  // Commented by Desmond @ 14-April-26
  // Use state hook for 'validationErrors' and 'setValidationErrors' to store 
  // the zod validation error message for each field
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  // Auth guard - redirect to /login if user is not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])
  
  // Initialize form data
  useEffect(() => {
    // Initialize the form for Add Asset form with default values for select fields and empty strings for other fields
    const initial: assetFormData = {} // Store the initial form data, keys as database column names and values as form input values
    
    config.formFields.forEach(field => {
      // Set select field to use first option and text fields to empty strings
      if (field.type === 'select' && field.options && field.options.length > 0) {
        initial[field.key] = field.options[0].value
      } else { // If field is not select, set it to empty string
        initial[field.key] = ''
      }
    })
    setFormData(initial) // Set the initial form data when component is mounted
  }, [config]) // Only run this effect when the config changes (when form changes to location or department)
  
  // ----------------------  Load related data (locations and departments) for select fields ------------------------
  const loadRelatedData = useCallback(async () => {
    setRelatedError(null) // Reset any previous errors before trying again
    try {
      // Fetch location and department data for the select fields in Add Asset form 
      // in parallel to reduce loading time
      const [locationsRes, departmentsRes] = await Promise.all([
        fetch('/api/location?page=1&limit=100'), // Fetch location for the dropdown menu
        fetch('/api/department?page=1&limit=100') // Fetch department for the dropdown menu
      ])
      
      // If either one of the request fails, throw an error 
      // to be caught in the catch block and display to user
      if (!locationsRes.ok || !departmentsRes.ok) throw new Error('Failed to load dropdown options')
      
      // Wait for both request to finish and parse the JSON response
      const [locationsData, departmentsData] = await Promise.all([
        locationsRes.json(), // Parse the location response
        departmentsRes.json() // Parse the department response
      ])
      
      // Update the relatedData with the fetched data to populate the dropdown menu options
      setRelatedData({
        locations: locationsData.data || [], // Use the fetched data, otherwise empty to prevent rendering error
        departments: departmentsData.data || []
      })
    } catch (error) { // Catch any errors and display to the user
      console.error('Error loading related data:', error)
      // Display this when dropdown menu options for location or department is unavailable because of fetching errors
      setRelatedError('Failed to load location and department options. Some dropdowns may be empty.')
    }
  }, [])
  
  // Check if the user is authenticated before loading related data
  useEffect(() => {
    if (status === 'authenticated') loadRelatedData()
  }, [status, loadRelatedData])
  
  /**
   * Dual debounce on asset_id field change
   * 400ms - update barcode preview to prevent excessive re-rendering
   * 800ms - GET /api/assets/check?asset_id to check if the asset ID is taken
   * Skip the duplicate check until at least 3 characters is entered
   * 
   * encodeURIComponent() to prevent injections using special characters in the asset ID
   */
  useEffect(() => {
    // Check if the form is for asset. Otherwise, skip the barcode preview and duplicate id check
    if (!isAssetForm) return
    
    // Get the current primary key value from the form data for the asset_id. 
    // Otherwise, resolve to using an empty string instead.
    const raw = String(formData[config.primaryKey] || '')
    
    // Clear previous timers immediately when a new character is entered
    if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current)
    
    // Handle empty input
    if (!raw.trim()) {
      setDuplicateStatus('idle')
      setBarcodeValue('')
      return
    }
    
    // Barcode preview update after 400ms
    barcodeTimerRef.current = setTimeout(() => setBarcodeValue(raw), 400)
    
    // Wait for at least three characters to be typed in before checking for duplicate asset_id
    if (raw.trim().length < 3) {
      setDuplicateStatus('idle')
      return
    }
    
    // Start checking for duplicates after 800ms
    // Show a loading spinner
    setDuplicateStatus('checking')
    // Check for duplicate asset_id
    duplicateTimerRef.current = setTimeout(async() => {
      try {
        // EncodeURIComponent to prevent special characters from being used for injection
        const res = await fetch(`/api/assets/check?asset_id=${encodeURIComponent(raw)}`)
        // If the response is not ok, we throw an error
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Parse the JSON response to check if the asset ID exists
        // If the API found the asset_id, then it is taken
        const { exists } = (await res.json()) as { exists: boolean }
        // Update the duplicate status based on the response
        setDuplicateStatus(exists ? 'taken' : 'available')
      } catch {
        // Set duplicate status to error to indicate that asset ID could not be verified
        setDuplicateStatus('error')
      }
    }, 800) // 800ms delay between checking
    
    // Cleanup function to clear both timers when component unmounts or formData changes
    return () => {
      // Clear the barcode preview timer
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current)
      // Clear the duplicate id check timer
      if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current)
    }
    // Run this effect when formData changes (when user is typing), 
    // or when form changed to another type (asset, location or department)
  }, [formData, config.primaryKey, isAssetForm])
  
  // BUGFIX 25-April Daryl: Strict Regex (Bans @, ., -, \, etc.) Hyphen is at the very end to work properly.
  const STRICT_INVALID_CHARS_REGEX = /[@!#%^&*()<>_{}|~/?;:'"\\.,-]/;
  // BUGFIX 25-April Daryl: Lenient Regex for Descriptions (Allows spaces, periods, commas, and hyphens)
  // BUGFIX 07-May: Daryl: Lenient Regex for Descriptions (Allows uppercase letters)
  const DESC_INVALID_CHARS_REGEX = /[@!#%^&*()<>_{}|~/?;:'"\\]/;
  // BUGFIX 25-April Daryl: Standard Email Format Validation
  const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // BUGFIX 25-April Daryl: Standard Mobile Format (Allows optional + at start, then digits)
  const MOBILE_FORMAT_REGEX = /^\+?[0-9]{8,15}$/;
  
  // Client-side field validation with regex patterns
  const validateField = (value: string | number | null, fieldConfig: formFieldConfig) => {
    if (value === null || value === '') return null;
    
    const strVal = String(value);
    
    // 1. Level Logic (Allows letters like 'G', 'LG', and hyphens like '-1')
    if (fieldConfig.key.toLowerCase() === 'level') {
      const LEVEL_REGEX = /^[-a-zA-Z0-9]+$/;
      if (!LEVEL_REGEX.test(strVal)) return 'Invalid: Level can only contain letters, numbers, and hyphens (e.g., G, -1).';
    }
    // 2. Number Input Logic (Excluding Level)
    else if (fieldConfig.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) return 'Invalid: Must be a number.';
      if (num <= 0) return 'Invalid: Value must be greater than 0.';
      if (num > 9999999) return 'Invalid: Value is too large.';
    } 
    // 3. Email Logic
    else if (fieldConfig.key.toLowerCase().includes('email')) {
      if (!EMAIL_FORMAT_REGEX.test(strVal)) return 'Invalid: Please enter a valid email address.';
    }
    // 4. Mobile/Phone Logic
    else if (fieldConfig.key.toLowerCase().includes('mobile') || fieldConfig.key.toLowerCase().includes('phone')) {
      if (!MOBILE_FORMAT_REGEX.test(strVal)) return 'Invalid: Mobile number must contain only numbers.';
    }
    // 5. Description/Textarea Logic (Lenient)
    else if (fieldConfig.type === 'textarea' || fieldConfig.key.toLowerCase().includes('desc')) {
      if (DESC_INVALID_CHARS_REGEX.test(strVal)) return 'Invalid: Contains sensitive special characters.';
    }
    // 6. Standard Text Input Logic (Strict)
    else if (fieldConfig.type === 'text') {
      if (STRICT_INVALID_CHARS_REGEX.test(strVal)) return 'Invalid: Contains sensitive special characters. Symbols like @, ., and - are not allowed here.';
    }
    
    // Character Limit Check
    if (fieldConfig.maxLength && strVal.length > fieldConfig.maxLength) {
      return `Exceeds database maximum length of ${fieldConfig.maxLength} characters.`;
    }
    
    return null;
  }
  
  // -------------------------- Handle the input changes -----------------------------
  const handleInputChange = (key: string, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [key]: value })) // Copy everything from previous object, then update the changed field
    
    // Validate the field on change and update validation errors
    const fieldConfig = config.formFields.find(f => f.key === key);
    if (fieldConfig) {
      const error = validateField(value, fieldConfig);
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if (error) newErrors[key] = error;
        else delete newErrors[key];
        return newErrors;
      });
    }
  }
  
  // -----------------------------  Handle form submission ----------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent the user from submitting empty forms
    
    // Client-side check to prevent a duplicate from being submitted
    if (isAssetForm && duplicateStatus === 'taken') {
      alert('Asset ID is already taken. Please choose a different ID.')
      return
    }
    
    // Client-side zod validation check before form is submitted.
    // If it fails, then display the error message.
    if (isAssetForm) { // Does this for asset form
      const result = assetFormSchema.safeParse(formData) // Validate form data against zod schema
      if (!result.success) { // If the check failed
        // Convert zod's error format into readable string for users
        const errorMessage: Record<string, string> = {} // Store the error message for each field - keys are db column name
        // '.issues' represents the array of validation errors for each field, returned by zod
        result.error.issues.forEach((err) => { 
          const field = err.path[0] as string // Get field name from error path
          if (field) errorMessage[field] = err.message // Store the error message for the field
        })
        setValidationErrors(errorMessage) // Set the validation error to display on the form
        return // Stop form submission if validation fails
      }
      // Clear any errors if validation passes
      setValidationErrors({})
    }
    
    // set loading state to disable the submit button and show loading text
    setLoading(true)
    
    try {
      // Convert empty strings on nullable FK fields to null
      const submissionData: assetFormData = { ...formData }
      
      // Convert empty string on nullable FK columns to explicit null
      // This is because Supabase may reject empty strings and expect null when no location or department is selected
      if (!submissionData['location_id'] || submissionData['location_id'] === '') { // If no location_id or if it's empty
        submissionData['location_id'] = null // Set to null
      }
      if (!submissionData['department_id'] || submissionData['department_id'] === '') {
        submissionData['department_id'] = null
      }
      
      // Send a POST request to the API route with the form data as JSON
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
      
      // Parse the JSON response from the server
      const result = await response.json()
      
      // If the response is ok, redirect to the previous URL. Otherwise, show an error message
      if (response.ok) {
        router.push(config.backUrl)
      } else if (response.status === 409) { // Handle conflict error for duplicate asset_id
        setDuplicateStatus('taken')
        alert('Asset ID already exists. Please choose a different ID.')
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
  
  // -----------------------  Field renderer to render different types of input fields based on the config ------------------------
  const renderField = (field: formFieldConfig) => {
    const value = formData[field.key] || ''
    // When duplicateStatus is 'taken', the input field border changes to red to indicate duplicate
    const isTaken = isAssetForm && field.key === config.primaryKey && duplicateStatus === 'taken'
    const hasError = !!validationErrors[field.key]
    const isLevel = field.key.toLowerCase() === 'level'
    
    // Commented by Desmond @ 22-April-26
    // -------------------------------------------------------------------------------------------------------------------------------------
    // -                     This is the BASE class for the input fields, change the attributes like column WIDTH here                     -
    // -------------------------------------------------------------------------------------------------------------------------------------
    const baseClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors ${
      isTaken || hasError 
        ? 'border-red-400 focus:ring-red-500 bg-red-50' // When asset_id is taken or validation fails, field border becomes red
        : 'border-gray-300 focus:ring-red-500 bg-white' // Normal state
    }`
    
    // ------------ Dropdown menu for select fields ----------------
    if (field.type === 'select') {
      // Options are defined in the config for static dropdowns.
      // For dynamic dropdowns, options are fetched from the server and stored in relatedData
      let options = field.options || [] 
      
      // For location_id field, use locations from relatedData
      if (field.key === 'location_id' && relatedData.locations.length > 0) {
        options = [{ value: '', label: 'Select Location' }, ...relatedData.locations.map((loc) => ({ value: loc['location_id'], label: loc['name'] }))]
      }
      // For department_id field, use departments from relatedData
      if (field.key === 'department_id' && relatedData.departments.length > 0) {
        options = [{ value: '', label: 'Select Department' }, ...relatedData.departments.map(dept => ({ value: dept['department_id'], label: dept['name'] }))]
      }
      
      // Return the drop down menu list of items
      return (
        <select value={String(value)} onChange={(e) => handleInputChange(field.key, e.target.value)} required={field.required} className={baseClass}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )
    }
    
    // --------------- Text area fields --------------------
    if (field.type === 'textarea') {
      return (
        <textarea 
          value={String(value)} 
          onChange={(e) => handleInputChange(field.key, e.target.value)} 
          placeholder={field.placeholder} 
          className={baseClass} 
          rows={3} 
          required={field.required} 
          maxLength={field.maxLength} 
        />
      )
    }
    
    // BUGFIX: We force type="text" globally so HTML doesn't block the letter "G" in the Level field.
    // The inputMode handles triggering the correct mobile keyboard.
    // ------------ Number or text input fields -------------------
    return (
      <input 
        id={field.key} 
        type="text" 
        inputMode={field.type === 'number' && !isLevel ? 'numeric' : 'text'}
        value={String(value)} 
        onChange={(e) => handleInputChange(field.key, e.target.value)} 
        placeholder={field.placeholder} 
        className={baseClass} 
        required={field.required} 
        // Indicate that the input is invalid because of duplicates or validation errors
        // to screen readers
        aria-invalid={isTaken || hasError} 
        maxLength={field.maxLength} 
      />
    )
  }
  
  // ------------------------- Disable the submit button --------------------------
  // loading - POST is being processed, to prevent multiple submissions
  // checking - Duplicate check is being processed
  // taken - Duplicate check found that the record already exists
  // hasClientErrors - Client-side validation failed
  const hasClientErrors = Object.keys(validationErrors).length > 0;
  const isSubmitDisabled = loading || hasClientErrors || (isAssetForm && (duplicateStatus === 'checking' || duplicateStatus === 'taken'))
  
  // Show a loading state while checking session and loading related data
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Form will not render for unauthenticated users
  if (status === 'unauthenticated') return null
  
  // -------------- Render the form with the dynamic fields based on config -------------------
  return (
    <div className="min-h-screen bg-white"> {/* Commented by Desmond @ 14-April-26: Changed bg-gray-50 to bg-white */}
      <main className="p-6">
        <div className="w-full mx-auto"> {/* Commented by Desmond @ 14-April-26: Changed width to w-full to display more content */}
          <Breadcrumb /> {/* Breadcrumb component */}
          
          {/* Page title and description */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Add {config.entityDisplayNameSingular}</h1>
            <p className="text-gray-600 mt-1">Create a new {config.entityDisplayNameSingular.toLowerCase()} record</p>
          </div>
          
          {/* Related data error banner */}
          {relatedError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {relatedError}
            </div>
          )}
          
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="p-6">
              {/* Commented by Desmond @ 22-April-26
                // -------------------------------------------------------------------------------------------------------------------------------------
                // -                     This is where you can change how many COLS are in a ROW for the INPUT FIELDS                                  -
                // -------------------------------------------------------------------------------------------------------------------------------------
              */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {config.formFields.map(field => (
                  // Text area spans both columns, while other fields take one column
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label}
                        {/* Shows a red asterisk to mark field as required */}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {/* Character counter for text and textarea fields */}
                      {(field.type === 'text' || field.type === 'textarea') && field.maxLength && (
                        <span className={`text-xs font-medium ${String(formData[field.key] || '').length > field.maxLength ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                          {String(formData[field.key] || '').length} / {field.maxLength}
                        </span>
                      )}
                    </div>
                    
                    {/* Client-side validation error - shown below the field if validation fails */}
                    {validationErrors[field.key] && (
                      <p className="mb-1 text-sm font-semibold text-red-600" role="alert">
                        {validationErrors[field.key]}
                      </p>
                    )}
                    
                    {/* Render the input element for the field type */}
                    {renderField(field)}
                    
                    {/* Duplicate check status badge only on the primaryKey field */}
                    {isAssetForm && field.key === config.primaryKey && (
                      <div id="asset-id-status">
                        <DuplicateCheckBadge status={duplicateStatus} assetId={String(formData[config.primaryKey] || '')} />
                      </div>
                    )}
                    
                    {/* Commented by Desmond @ 25-Mar-26 
                        Render the barcode preview below the asset_id input field
                        only when the form is asset and not department or location
                    */}
                    {isAssetForm && field.key === config.primaryKey && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Barcode preview</p>
                        {/* Present a barcode preview to the user */}
                        <BarcodePreview value={barcodeValue} label={String(formData.name || '')} showCopyButton={true} isDuplicate={duplicateStatus === 'taken'} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Action buttons */}
              <div className="mt-8 flex justify-end space-x-3">
                {/* Cancel button */}
                <button type="button" onClick={() => router.push(config.backUrl)} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  Cancel
                </button>
                
                {/* Submit button */}
                <button type="submit" disabled={isSubmitDisabled} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  {/* When loading, disable the submit button to prevent multiple submissions */}
                  {loading ? (isAssetForm ? 'Saving & generating barcode...' : 'Adding...' ) : duplicateStatus === 'checking' && isAssetForm ? 'Checking ID...' : `Add ${config.entityDisplayNameSingular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

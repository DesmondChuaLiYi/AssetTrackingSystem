// components\dynamicPage.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file dynamicPage.tsx
 * @description A reusable dynamic component page  that contains a data table for the admin module
 * 
 * This single component handles the record listing, searching, sorting, pagination
 * and deleting based on the config object passed to it (assets, locations, departments)
 * 
 * Responsibilities
 *   1. Auth guard - render nothing until admin session is confirmed
 *   2. Data loading - fetch data and paginated them from the configured API endpoint
 *   3. Search + filter - passes search and filter params to the API
 *   4. Sort - sort by column, ascending or descending
 *   5. Delete - ask the user for confirmation then performs soft delete (DELETE) request
 *   6. Export PDF - fetches all records in pages, generate the PDF using jsPDF
 *   7. Export CSV - fetches all records in pages, then generate a CSV file
 * 
 * Props
 *   - config - describes the entity: columns, form fields, API endpoints, URLs, etc.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/breadcrumb'
import DataTable from '@/components/ui/dataTable'

export interface DynamicPageConfig {
  entityName: string // 'asset', 'location', 'department'
  entityDisplayName: string // 'Assets', 'Locations', 'Departments'
  entityDisplayNameSingular: string // 'Asset', 'Location', 'Department'
  apiEndpoint: string // '/api/assets', '/api/locations', '/api/departments'
  primaryKey: string // 'asset_id', 'location_id', 'department_id'
  columns: any[]
  formFields: FormFieldConfig[]
  showAddButton?: boolean
  showConditionFilter?: boolean
  searchFields: { key: string; label: string }[]
  defaultSortBy: string
  pageTitle: string
  pageDescription: string
  addUrl?: string  // optional — pages without Add don't need this
  editUrl?: string // optional — pages without Edit don't need this

  // NEW: optional extensions for maintenance-style pages ──────────────────
  tabsConfig?: TabConfig[]        // renders tabs above DataTable if provided
  tabQueryParam?: string          // query param name sent to API (default: 'status')
  customActions?: CustomAction[]  // replaces Edit/Delete buttons if provided
  modalConfig?: ModalConfig       // renders a modal when a row is selected
}

// NEW: one entry per tab (e.g. Pending / Approved / Rejected)
export interface TabConfig {
  key: string           // value sent to API e.g. 'pending'
  label: string         // display label
  icon?: React.ReactNode
  badgeKey?: string     // key inside tabCounts returned by API
  activeColor?: string  // tailwind classes e.g. 'border-yellow-600 text-yellow-600'
}

// NEW: custom row action — used instead of Edit/Delete when customActions is set
export interface CustomAction {
  label: string
  icon?: React.ReactNode
  className: string
  onClick: (row: any, refresh: () => void) => void
  show?: (row: any, activeTab?: string) => boolean
  disabled?: (row: any) => boolean
}

// NEW: modal config — DynamicPage manages selectedRow state internally
export interface ModalConfig {
  renderModal: (row: any, onClose: () => void) => React.ReactNode
}

interface FormFieldConfig {
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

// The configuration object that is passed to dynamicPage
export interface dynamicPageConfig {
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

  // Table column definitions
  columns: {
    key: string 
    label: string 
    sortable?: boolean
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
  }[]

  // Ordered list of form fields to render in the dynamicEdit page
  formFields: formFieldConfig[]
  // Display a add button that redirects to the add form page
  showAddButton?: boolean
  // Shows the condition filter for the asset listing ('In-use'...)
  showConditionFilter?: boolean
  // Search fields on top of the table listing
  searchFields: { key: string; label: string }[]
  // Default method of sorting the records in the data table
  defaultSortBy: string
  // Page heading shown at the top
  pageTitle: string
  // Description of the page
  pageDescription: string
  // URL for add page
  addUrl: string
  // URL for edit page (will append ID)
  editUrl: string
}

// Receive config object from pages that use the dynamicPage
interface dynamicPageProps {
  config: dynamicPageConfig
}

// Type for entity rows with unknown value types
type entityRow = Record<string, unknown>

/** Commented by Desmond @ 26-Mar-26
 * Allow the print PDF function to fetch all records, by max of 100 records with each API call to avoid security issues
 */
async function fetchAllRecords(apiEndpoint: string, baseParams: Record<string, string>): Promise<entityRow[]> {
  const allData: entityRow[] = [];
  const API_LIMIT = 100; // In the Zod schema, 100 is the server-side limit for how much records an API can fetch
  let page = 1;
  let hasMore = true;
  let totalFetched = 0;
  let totalAvailable = 0;

  while (hasMore) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: API_LIMIT.toString(),
      ...baseParams
    });

    try {
      const res = await fetch(`${apiEndpoint}?${params}`)

      if (!res.ok) {
        throw new Error(
          `API returned ${res.status}: ${res.statusText}. ` +
          `This may indicate a validation error in query parameters.`
        );
      }
      const responseData = await res.json();
      
      if(!Array.isArray(responseData.data)) {
        throw new Error(
          `Invalid response format: expected data array, got ${typeof responseData.data}`
        );
      }

      if (typeof responseData.totalItems !== 'number') {
        throw new Error('Invalid response format: totalItems must be a number');
      }

      allData.push(...responseData.data);
      totalFetched = allData.length;
      totalAvailable = responseData.totalItems;

      // If the environment is not in production, then we can log the output to console 
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[fetchAllRecords] Page ${page}: fetched ${responseData.data.length} records (total: ${totalFetched}/${totalAvailable})`);
      }

      // Stop when all records are fetched
      hasMore = totalFetched < totalAvailable
      page++;
    } catch (error) {
      // Log the error to the user
      console.error('[fetchAllRecords] Error on page', page, ':', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
  // Return all the fetched data
  return allData
}

// --------------- Export the main component --------------------
/** @params config - Describes the entity's columns, API, URLs and display names */
export default function DynamicPage({ config }: dynamicPageProps) {
  // Use admin access - wraps useSession with an admin role check
  const { session, isLoading: sessionLoading } = useAdminAccess()
  const router = useRouter()

  // The current page's records - typed rows with unknown field values
  const [data, setData] = useState<entityRow[]>([])
  // const [relatedData, setRelatedData] = useState<{ [key: string]: any[] }>({})
  
  // True while there is a data fetch in the way
  const [loading, setLoading] = useState(true)

  // Prevents SSR and hydration mismatch
  // Gate (fetch, localStorage) until mounted is true
  const [mounted, setMounted] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState(config.searchFields[0]?.key || 'name')

  // Filter
  const [conditionFilter, setConditionFilter] = useState('')

  // Pagination
  // Set the current page
  const [currentPage, setCurrentPage] = useState(1)
  // Set the records per page
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  // Initial total items
  const [totalItems, setTotalItems] = useState(0)
  // Initial total pages
  const [totalPages, setTotalPages] = useState(0)

  // Sort state
  const [sortBy, setSortBy] = useState(config.defaultSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [showModal, setShowModal] = useState(false)
  const [currentItem, setCurrentItem] = useState<any | null>(null)
  const [formData, setFormData] = useState<any>({})

  // NEW: tab state — only meaningful when tabsConfig is provided
  const [activeTab, setActiveTab] = useState(config.tabsConfig?.[0]?.key || '')
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({})

  // NEW: modal state — only meaningful when modalConfig is provided
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

  useEffect(() => setMounted(true), [])

  // --------------- Trigger data reload whe any search/sort/page/filter state changes ------------------------
  useEffect(() => {
    // If the app is mounted and has valid session
    if (mounted && session) {
      loadData()
      // loadRelatedData()
    }
  }, [mounted, session, currentPage, recordsPerPage, sortBy, sortOrder, conditionFilter, activeTab]) // NEW: activeTab added


  // -------------------- Fetches one page of record from the API -------------------------
  // Loading the data with pagination, sorting and filtering
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter }),
        // NEW: include active tab as query param when tabs are configured
        ...(config.tabsConfig && activeTab && { [config.tabQueryParam || 'status']: activeTab }),
      })
      const res = await fetch(`${config.apiEndpoint}?${params}`)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const responseData = await res.json()
      // NEW: support both { data } (standard) and { assessments } (tab-style) responses
      setData(responseData.data ?? responseData.assessments ?? [])
      setTotalItems(responseData.totalItems)
      setTotalPages(responseData.totalPages)
      // NEW: populate tab badge counts if API returns them
      if (responseData.tabCounts) setTabCounts(responseData.tabCounts)
    } catch (e) {
      alert(`Failed to load ${config.entityDisplayName.toLowerCase()}`)
    } finally {
      // Unmount the loading spinner to prevent stuck in loading
      setLoading(false)
    }
  }, [currentPage, recordsPerPage, sortBy, sortOrder, searchTerm, searchField, conditionFilter, config.apiEndpoint, config.entityDisplayName])

  // const loadRelatedData = async () => {
  //   // Load related data for dropdowns (locations, departments)
  //   const relatedEndpoints = {
  //     locations: '/api/location',
  //     departments: '/api/department'
  //   }

  //   const newRelatedData: { [key: string]: any[] } = {}

  //   for (const [key, endpoint] of Object.entries(relatedEndpoints)) {
  //     try {
  //       const res = await fetch(endpoint)
  //       if (res.ok) {
  //         const data = await res.json()
  //         newRelatedData[key] = data.data || []
  //       }
  //     } catch (e) {
  //       console.error(`Failed to load ${key}:`, e)
  //     }
  //   }

  //   setRelatedData(newRelatedData)
  // }

  // -------------  Handlers for search, reset, pagination, sorting, and add/edit/delete ----------------
  // Reset to 1 and triggers a fresh search
  const handleSearch = useCallback(() => { 
    setCurrentPage(1);
    loadData() 
  },[loadData])


  // ---------------- Handle reset ---------------
  // Clear all search/filter/sort state back to defaults
  const handleReset = useCallback(() => {
    // Clear the search field
    setSearchTerm('')
    // Reset the searched records
    setSearchField(config.searchFields[0]?.key ?? 'name')
    // Reset the condition filter
    setConditionFilter('')
    // Reset the pagination
    setCurrentPage(1)
    // Reset the sort order to default
    setSortBy(config.defaultSortBy)
    // Sort descending
    setSortOrder('desc')
  }, [config.searchFields, config.defaultSortBy]) 


  const handleAdd = () => {
    if (config.addUrl) router.push(config.addUrl) // addUrl is optional
  }

  const handleEdit = (item: any) => {
    if (config.editUrl) router.push(`${config.editUrl}/${item[config.primaryKey]}`) // editUrl is optional
  }

  
  // --------------- Handle deleting records ---------------------
  const handleDeleteRequest = useCallback(async (item: entityRow) => {
    const itemId = String(item[config.primaryKey])

    // Show the browser confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${config.entityDisplayNameSingular.toLowerCase()} with ID: ${itemId}?
      \n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      // Delete cancelled
      return
    }

    // Proceed to delete after the user confirms it
    try {
      const url = new URL(config.apiEndpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localost:3000')
      url.searchParams.set(config.primaryKey, itemId)

      const res = await fetch(url.toString(), { method: 'DELETE' })

      if (res.ok) {
        setCurrentPage(1) // Reset to the first page
        loadData() // Refresh the data
      } else {
        const error = await res.json().catch(() => ({}))
        throw new Error(`API returned ${res.status}: ${JSON.stringify(error)}`)
      }
    } catch (error) {
      console.error('[handleDeleteRequest] Error deleting:', error)
      alert(`Failed to delete ${config.entityDisplayNameSingular.toLowerCase()}`)
    }
  }, [config.apiEndpoint, config.primaryKey, config.entityDisplayNameSingular, loadData])

  // const handleSave = async () => {
  //   // Validate required fields
  //   const requiredFields = config.formFields.filter(field => field.required)
  //   for (const field of requiredFields) {
  //     if (!formData[field.key]) {
  //       return alert(`Please fill in ${field.label}`)
  //     }
  //   }

  //   const res = await fetch(config.apiEndpoint, {
  //     method: 'PUT',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(formData)
  //   })

  //   if (res.ok) {
  //     alert(`${config.entityDisplayNameSingular} updated successfully!`)
  //     setShowModal(false)
  //     loadData()
  //   } else {
  //     alert(`${config.entityDisplayNameSingular} update failed!`)
  //   }
  // }


  // -------------------- Export to PDF -------------------------
  const handleExportPDF = useCallback(async () => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const allData = await fetchAllRecords(config.apiEndpoint, {
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })

      // If data length is empty
      if (allData.length === 0) {
        alert('No data to export')
        return
      }

      // Dynamic imports - only download jsPDF when user actually exports
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      // const autoTable = autoTableModule.default

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Report header
      doc.setFontSize(18)
      doc.text('Asset Tracking System', 14, 20)
      doc.setFontSize(14)
      doc.text(`${config.entityDisplayName} Report`, 14, 30)

      let yPosition = 40
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
      yPosition += 6
      doc.text(`Total ${config.entityDisplayName}: ${allData.length}`, 14, yPosition)
      yPosition += 6

      if (searchTerm) {
        doc.text(`Search Filter: ${searchField} = "${searchTerm}"`, 14, yPosition)
        yPosition += 6
      }

      if (conditionFilter) {
        doc.text(`Condition Filter: ${conditionFilter}`, 14, yPosition)
        yPosition += 6
      }

      // const tableColumn = config.columns.map(col => col.label)
      // const tableRows = dataToExport.map((item, index) => {
      //   return config.columns.map(col => {
      //     if (col.render && typeof col.render === 'function') {
      //       const rendered = col.render(item[col.key], item)
      //       return typeof rendered === 'string' ? rendered : item[col.key] || ''
      //     }
      //     return item[col.key] || ''
      //   })
      // })

      // Table data
      autoTable(doc, {
        startY: yPosition + 5,
        head: [config.columns.map((col) => col.label)],
        body: allData.map((item) =>
          config.columns.map((col) => {
            if (col.render) {
              const rendered = col.render(item[col.key], item)
              return typeof rendered === 'string' ? rendered : String(item[col.key] || '')
            }
            return String(item[col.key] || '')
          })
        ),
        theme: 'grid',
        // Header styles
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        // Normal styles
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        }
      })

      // Save the report to pc with a dedicated name
      doc.save(`${config.entityName}-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      console.log('[handleExportPDF] PDF generated successfully')
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [config, sortBy, sortOrder, searchTerm, searchField, conditionFilter])


  // -------------------  Export data table to CSV file --------------------
  // Fetch all records in chunks and respect API limits
  const handleExportCSV = useCallback(async () => {
    try {
      const allData = await fetchAllRecords(config.apiEndpoint, {
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })

      // If there is no data to export
      if (allData.length === 0) {
        alert('No data to export')
        return
      }

      // Column numbers
      const headers = ['No.', ...config.columns.map(col => col.label)]
      // Map the rows to item and index
      const rows = allData.map((item, index) => {
        // Set the row number to index + 1 because index starts from 0
        const row: string[] = [(index + 1).toString()]
        config.columns.forEach(col => {
          if (col.render) {
            const rendered = col.render(item[col.key], item)

            const value = typeof rendered === 'string' ? rendered : String(item[col.key] || 'N/A')
            row.push(`"${value.replace(/"/g, '""')}"`) // Escape quotes in CSV
          } else {
            const value = String(item[col.key ?? 'N/A'])
            row.push(`"${value.replace(/"/g, '""')}"`) // Escape quotes in CSV
          }
        })
        return row
      })

      // Create and download the CSV file
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${config.entityName}-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[handleExportCSV] Error:', error)
      alert(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`) 
    }
  }, [config, sortBy, sortOrder, searchTerm, searchField, conditionFilter])


  // ------------------  Show loading state while checking session and loading data -------------------
  if (!mounted || sessionLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // ------------------------ Render the elements of the page ------------------------------
  return (
    <div className="min-h-screen bg-white"> {/* Commented by Desmond @ 14-April-26: Changed bg-gray-50 to bg-white */}
      <main className="p-6">
        <div className="w-full mx-auto"> {/* Commented by Desmond @ 14-April-26: Changed width to w-full to display more content */}
          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Page heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{config.pageTitle}</h1>
            <p className="text-gray-600 mt-1">{config.pageDescription}</p>
          </div>

          {/* NEW: tabs rendered above DataTable only when tabsConfig is provided */}
          {config.tabsConfig && (
            <div className="mb-4">
              <div className="flex gap-2 border-b border-gray-200">
                {config.tabsConfig.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                    className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                      activeTab === tab.key
                        ? `border-b-2 ${tab.activeColor || 'border-red-600 text-red-600'}`
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badgeKey !== undefined && (
                      <span className="ml-1">({tabCounts[tab.badgeKey!] ?? 0})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DataTable
            title={`${config.entityDisplayName} Listing`}
            columns={
              // NEW: when customActions provided, append an Actions column
              config.customActions
                ? [
                    // Inject setSelectedRow into columns that have a clickable thumbnail - WC
                    ...config.columns.map(col =>
                      col.key === 'asset_id' && config.modalConfig
                        ? {
                            ...col,
                            render: (v: any, row: any, rowIndex?: number) => {
                              const original = col.render?.(v, row, rowIndex)
                              if (!row.image_url || !original) return original
                              // Wrap the column output so clicking the thumbnail opens the modal - WC
                              return (
                                <div
                                  onClick={() => setSelectedRow(row)}
                                  style={{ cursor: 'pointer' }}
                                  title="Click image to enlarge"
                                >
                                  {original}
                                </div>
                              )
                            },
                          }
                        : col
                    ),
                    {
                      key: '__actions__',
                      label: 'Actions',
                      sortable: false,
                      render: (_: any, row: any) => {
                        // Renders custom actions with conditional visibility per row/tab - WC
                        const visibleActions = config.customActions!.filter(action => !action.show || action.show(row, activeTab))
                        const viewAction = visibleActions.find(a => a.label === 'View')
                        const approveAction = visibleActions.find(a => a.label === 'Approve')
                        const rejectAction = visibleActions.find(a => a.label === 'Reject')
                        // otherActions: Reopen and anything else not in the icon row - WC
                        const otherActions = visibleActions.filter(a => !['View', 'Approve', 'Reject'].includes(a.label))

                        return (
                          // Actions are split into two rows when Approve/Reject are present to emphasize them, 
                          // as they're the most common actions on maintenance pages - WC
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex flex-col gap-1">
                              {approveAction && (
                                <button
                                  title="Approve"
                                  onClick={() => approveAction.onClick(row, loadData)}
                                  disabled={approveAction.disabled?.(row)}
                                  className={approveAction.className}
                                >
                                  {approveAction.icon}
                                  {approveAction.label}
                                </button>
                              )}
                              {rejectAction && (
                                <button
                                  title="Reject"
                                  onClick={() => rejectAction.onClick(row, loadData)}
                                  disabled={rejectAction.disabled?.(row)}
                                  className={rejectAction.className}
                                >
                                  {rejectAction.icon}
                                  {rejectAction.label}
                                </button>
                              )}
                            </div>
                            {/* Reopen and any other actions rendered below the icon buttons - WC */}
                            {otherActions.map(action => (
                              <button
                                key={action.label}
                                title={action.label}
                                onClick={() => action.onClick(row, loadData)}
                                disabled={action.disabled?.(row)}
                                className={action.className}
                              >
                                {action.icon}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )
                      },
                    },
                  ]
                : config.columns  // original behaviour untouched for asset/location/dept pages - WC
            }
            data={data}
            loading={loading}
            searchTerm={searchTerm}
            searchField={searchField}
            searchFields={config.searchFields}
            onSearchFieldChange={setSearchField}
            onSearchChange={setSearchTerm}
            onSearch={handleSearch}
            onReset={handleReset}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            showConditionFilter={config.showConditionFilter}
            conditionFilter={conditionFilter}
            onConditionFilterChange={setConditionFilter}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            recordsPerPage={recordsPerPage}
            onPageChange={setCurrentPage}
            onRecordsPerPageChange={setRecordsPerPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            // NEW: skip Edit/Delete when customActions is configured
            actions={!config.customActions ? { onEdit: handleEdit, onDelete: handleDelete } : undefined}
            showAddButton={config.showAddButton}
            onAdd={handleAdd}
          />
          
        </div>
      </main>
      {/* NEW: modal rendered only when modalConfig provided and a row is selected */}
      {config.modalConfig && selectedRow && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRow(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            {config.modalConfig.renderModal(selectedRow, () => setSelectedRow(null))}
          </div>
        </div>
      )}
    </div>
  )
}
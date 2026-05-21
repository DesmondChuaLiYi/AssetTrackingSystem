'use client'

/** Commented by Desmond @ 20-May-26
 * @file components/ui/dataTable.tsx
 * @description A sortable/paginated data table component used by all admin listing
 * pages.
 * 
 * LATEST CHANGES:
 * ---------------
 * Overview:
 *    Admin can select multiple rows and print their barcode (assets) or QR codes
 *    (locations, departments) on a single A4 page.
 * 
 *    Industry-standard barcode/QR code limit in one A4 page:
 *      - QR codes: 9 per page (3 x 3 grid, -60 mm per cell)
 *      - Barcode: 14 per page(2 x 7 grid, -38 mm height per label)
 *    
 *    QR codes (9 per page):      Barcode (14 per page):
 *    ----------------            -------------------------
 *    | QR | QR | QR |            | Barcode 1 | Barcode 2 | 
 *    ----------------            -------------------------
 *    | QR | QR | QR |            | Barcode 3 | Barcode 4 |
 *    ----------------            -------------------------
 *    | QR | QR | QR |            | Barcode 5 | Barcode 6 |
 *    ----------------            -------------------------
 *    3 x 3 grid, 60 mm/cell      | Barcode 7 | Barcode 8 |
 *                                -------------------------
 *                                | Barcode 9 | Barcode10 |
 *                                -------------------------
 *                                | Barcode11 | Barcode12 |
 *                                -------------------------  
 *                                | Barcode13 | Barcode14 |
 *                                -------------------------  
 *                                2 x 7 grid , 38 mm height/label
 * 
 * New props added to the dataTableProps:
 *    codePrintType - 'barcode' | 'qr' | null
 *      When non-null, a checkbox column appears as the first column and the Print /
 *      Cancel bar appears next to the Add button.
 * 
 *    selectedIds - Set<string>
 *      The set of selected primary-key values, managed by the parent (dynamicPage)
 *      so selection survives pagination.
 * 
 *    onToggleSelect - (id: string) => void
 *      Called when a single row checkbox is toggled.
 * 
 *    onSelectAll - (ids: string[]) => void
 *      Called when the header "select all visible" checkbox is toggled.
 * 
 *    primaryKey - string
 *      The field name used to derive each row's ID for selection.
 * 
 *    onBulkPrint - () => void
 *      Called when the admin clicks the Print button in the selection bar.
 * 
 *    onCancelBulkPrint - () => void
 *      Called when the admin clicks Cancel in the selection bar.
 * 
 *    maxSelectCount - number
 *      Maximum allowed selections (9 for QR, 14 for barcode).
 * 
 * The "Print barcode" / "Print QR codes" option is added to the existing Print dropdown.
 * It is only shown when bulkPrintType is set in the config passed down from dynamicPage.
 * 
 * Danger alert:
 *    When the user tries to select more records, beyond the maxSelectCount, a red
 *    alert banner appears below the table header. It auto-dismisses when the selection
 *    drops below the limit.
 */

import { useState, useEffect } from 'react'
import { 
  ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, 
  MagnifyingGlassIcon, 
  ArrowPathIcon, 
  DocumentArrowDownIcon, 
  PlusIcon, 
  FunnelIcon,
  PrinterIcon,
  QrCodeIcon, 
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// ---------------------------------------------------------------------------
//                                  Types
// ---------------------------------------------------------------------------
interface column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}


// Type of code to print in bulk, either barcode or QR codes
export type codePrintType = 'barcode' | 'qr'


// Properties for the data table component
export interface dataTableProps {
  title: string
  columns: column[]
  data: any[]
  loading?: boolean
  searchTerm?: string
  searchField?: string
  searchFields?: { key: string; label: string }[] // Add support for custom search fields
  onSearchFieldChange?: (field: string) => void
  onSearchChange?: (term: string) => void
  onSearch?: () => void
  onReset?: () => void
  onExportPDF?: (exportAll?: boolean) => void
  onExportCSV?: () => void
  onAdd?: () => void
  addButtonText?: string
  showAddButton?: boolean
  showExportButtons?: boolean
  conditionFilter?: string
  onConditionFilterChange?: (condition: string) => void
  showConditionFilter?: boolean
  currentPage: number
  totalPages: number
  totalItems: number
  recordsPerPage: number
  onPageChange: (page: number) => void
  onRecordsPerPageChange?: (records: number) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string) => void
  actions?: {
    onEdit?: (row: any) => void
    onDelete?: (row: any) => void
    onView?: (row: any) => void
  }

  // Commented by Desmond @ 20-May-26: Bulk printing props for barcode or QR
  // When not null, the checkbox column is visible and selection bar is shown.
  codePrintType?: codePrintType | null

  // Set of selected primary key values to be used to print out the QR / barcode
  selectedIds?: Set<string>

  // Toggle a checkbox for a single row
  onToggleSelect?: (id: string) => void

  // Select or deselect all visible rows
  onSelectAll?: (id: string[]) => void

  // The primary key field used as the row key for selection
  primaryKey?: string

  // Execute when the admin clicks Print in the selection bar - to print the QR / barcode
  onBulkPrint?: () => void

  // Execute when the admin clicks Cancel in the selection bar to cancel printing
  onCancelBulkPrint?: () => void

  // Maximum allowed selections for barcode and QR code (allowed number of codes to be
  // printed in a single A4 paper)
  maxSelectCount?: number

  // Called when the Print Barcode / Print QR item in the dropdown is clicked
  onStartBulkPrint?: () => void
}


// ---------------------------------------------------------------------------
//                  The main component for the data table
// ---------------------------------------------------------------------------
export default function DataTable({
  title,
  columns,
  data,
  loading = false,
  searchTerm = '',
  searchField = 'name',
  searchFields, // Accept custom search fields
  onSearchFieldChange,
  onSearchChange,
  onSearch,
  onReset,
  onExportPDF,
  onExportCSV,
  onAdd,
  addButtonText = 'Add',
  showAddButton = false,
  showExportButtons = true,
  conditionFilter = '',
  onConditionFilterChange,
  showConditionFilter = false,
  currentPage,
  totalPages,
  totalItems,
  recordsPerPage,
  onPageChange,
  onRecordsPerPageChange,
  sortBy,
  sortOrder,
  onSort,
  actions,
  
  // QR / barcode bulk printing props
  codePrintType = null,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  primaryKey = 'id',
  onBulkPrint,
  onCancelBulkPrint,
  maxSelectCount = 9,
  onStartBulkPrint

}: dataTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Show the danger alert when selected number of records exceed the number of QR
  // or barcode allowed to be printed on a single A4 paper
  const [showLimitAlert, setShowLimitAlert] = useState(false)


  // When search term changes, update the search term attribute
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])


  // Show or hide the danger alert when selected number of records exceed the number 
  // of QR or barcode allowed to be printed on a single A4 paper
  useEffect(() => {
    // If the selected records exceed the max count
    if (selectedIds.size > maxSelectCount) {
      // Display the alert
      setShowLimitAlert(true)
    } else {
      // Otherwise, hide the alert
      setShowLimitAlert(false)
    }
  // Updated when the number of selected IDs change
  }, [selectedIds.size, maxSelectCount])


  const handleSearchChange = (v: string) => {
    setLocalSearchTerm(v)
    onSearchChange?.(v)
  }


  // When enter is pressed, search using the enter values in the search bar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.()
    }
  }


  // Handle exporting the data table to a PDF or CSV
  const handleExportSelection = (type: 'pdf' | 'csv') => {
    // If the selected option is PDf
    if (type === 'pdf') {
      // Run the export to PDF function
      onExportPDF?.() // Always export all records

    // If selected option is CSV
    } else if (type === 'csv') {
      // Run the export to CSV function
      onExportCSV?.() // Always export all records
    }

    // After that, hide the dropdown menu
    setShowExportMenu(false)
  }


  // Checking if all records checkbox are selected
  const visibleRowIds = data.map(row => String(row[primaryKey] ?? ''))

  const selectedAllRow = 
    visibleRowIds.length > 0 && visibleRowIds.every(id => selectedIds.has(id))

  // Handle the checkbox to select or deselect all records in the table header
  const handleHeaderCheckbox = () => [
    onSelectAll?.(visibleRowIds)
  ]


  // Label text and icon for the bulk printing QR / barcode option
  const bulkPrintLabel = codePrintType === 'barcode' ? 'Print Barcode' : 
                                                       'Print QR codes'
  // Icon for the bulk printing QR / barcode option
  const BulkPrintIcon = codePrintType === 'barcode' ? PrinterIcon : QrCodeIcon
  // Selected number of records count
  const selectionCount = selectedIds.size


  // ---------------------------------------------------------------------------
  //                        Render the paginated pages
  // ---------------------------------------------------------------------------
  const renderPagination = () => {
    // Explicitly tell TypeScript that this array will contain React renderable 
    // components
    const pages: React.ReactNode[] = []
    const max = 5
    
    let start = Math.max(1, currentPage - Math.floor(max / 2))

    let end = Math.min(totalPages, start + max - 1)

    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1)
    }

    // Pagination logic for the number of available pages on the bottom right side
    // of the page
    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          // Change the page to the specific page selected
          onClick={() => onPageChange(i)}
          className={`px-3 py-2 text-sm rounded-md transition-colors ${
            currentPage === i 
              ? 'bg-red-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      )
    }

    const startRecord = totalItems > 0 ? ((currentPage - 1) * recordsPerPage) + 1 : 0
    const endRecord = totalItems > 0 ? Math.min(currentPage * recordsPerPage, totalItems) : 0

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 
                      bg-white border-t border-gray-200 gap-4">
        <span className="text-sm text-gray-700">
          {totalItems > 0 ? `Record ${startRecord} to ${endRecord} of ${totalItems}` : 'No records found'}
        </span>

        <div className="flex gap-1">
          <button 
            onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
            disabled={currentPage === 1 || totalPages === 0} 
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md 
                       hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-colors"
          >
            Previous
          </button>
          
          {pages}

          <button 
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
            disabled={currentPage === totalPages || totalPages === 0} 
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md 
                       hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            Next
          </button>

        </div>
      </div>
    )
  }


  // ---------------------------------------------------------------------------
  //                    Render the data table component
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Data table header ------------------------------------------------------- */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">

          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>

          {/* Buttons in the header strip of data table --------------------------- */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Print / Cancel buttons: Only shown in bulk-print mode ------------- */}
            {codePrintType && (
              <div className='flex items-center gap-2'>
                {/* Number of selections */}
                <span className='text-sm text-black font-medium'>
                  {selectionCount} / {maxSelectCount} selected
                </span>

                {/* Print button (disabled until at least one row is selected) */}
                <button type='button' onClick={onBulkPrint}
                        disabled={selectionCount === 0}
                        aria-label={`Print ${selectionCount} selected ${codePrintType
                          === 'barcode' ? 'barcode(s)' : 'QR codes'
                        }`}
                        className='flex items-center gap-1.5 px-3 py-2 bg-red-600
                                   text-white rounded-md text-sm font-medium
                                   hover:bg-red-700 disabled:opacity-40
                                   disabled:cursor-not-allowed transition-colors'
                >
                  <BulkPrintIcon className='h-4 w-4' aria-hidden='true' />
                  
                  <span className='hidden sm:inline'>
                    Print
                  </span>
                </button>

                {/* Cancel button (cancel the printing operation) */}
                <button type='button' onClick={onCancelBulkPrint}
                        aria-label='Cancel bulk printing QR / barcode'
                        className='flex items-center gap-1.5 px-3 py-2 bg-gray-200
                                   text-gray-700 rounded-md text-sm font-medium
                                   hover:bg-gray-300 transition colors'
                >
                  <XMarkIcon className='h-4 w-4' aria-hidden='true' />
                  <span className='hidden sm-inline'>
                    Cancel
                  </span>
                </button>

              </div>
            )}


            {/* Add button to redirect to the add record page --------------------- */}
            {showAddButton && onAdd && (
              <button onClick={onAdd} 
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 
                                 text-white rounded-md text-sm hover:bg-red-700 
                                 transition-colors"
              >
                <PlusIcon className="h-4 w-4" /> 
                {addButtonText}
              </button>
            )}

          </div>

        </div>
      </div>


      {/* Filters and Controls ---------------------------------------------------- */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="space-y-4">

          {/* Search Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchFields && searchFields.length >= 2 ? (
              <>
                {/* First search field from config (usually ID) */}
                <div>
                  {/* Label */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchFields[0].label}
                  </label>

                  {/* Search field input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchField === searchFields[0].key ? localSearchTerm : ''}
                        onChange={e => {
                          onSearchFieldChange?.(searchFields[0].key)
                          handleSearchChange(e.target.value)
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={`Enter ${searchFields[0].label.replace('Search by ', '')}...`}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md 
                                   focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Second search field from config (usually Name) */}
                <div>
                  {/* Label */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchFields[1].label}
                  </label>

                  {/* Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchField === searchFields[1].key ? localSearchTerm : ''}
                        onChange={e => {
                          onSearchFieldChange?.(searchFields[1].key)
                          handleSearchChange(e.target.value)
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={`Enter ${searchFields[1].label.replace('Search by ', '')}...`}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md 
                                   focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 
                                                      text-gray-400" 
                      />
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <>
                {/* Fallback to dynamic title-based search if no searchFields provided */}
                <div>
                  {/* Label */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by {title.replace(' Listing', '')} ID
                  </label>

                  {/* Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchField === `${title.toLowerCase().split(' ')[0]}_id` ? localSearchTerm : ''}
                        onChange={e => {
                          onSearchFieldChange?.(`${title.toLowerCase().split(' ')[0]}_id`)
                          handleSearchChange(e.target.value)
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={`Enter ${title.replace(' Listing', '')} ID...`}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md 
                                   focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 
                                                      text-gray-400" 
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  {/* Label */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by {title.replace(' Listing', '')} Name
                  </label>

                  {/* Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchField === 'name' ? localSearchTerm : ''}
                        onChange={e => {
                          onSearchFieldChange?.('name')
                          handleSearchChange(e.target.value)
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={`Enter ${title.replace(' Listing', '')} Name...`}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md 
                                   focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 
                                                      text-gray-400" 
                      />
                    </div>
                  </div>
                </div>

              </>
            )}
          </div>

          {/* Action Buttons and Filters ------------------------------------------- */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center 
                          justify-between gap-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Condition Filter (for assets) */}
              {showConditionFilter && onConditionFilterChange && (
                <div className="relative">
                  <select
                    value={conditionFilter}
                    onChange={e => onConditionFilterChange(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-md 
                               appearance-none bg-white focus:ring-2 focus:ring-red-500
                               focus:border-red-500"
                  >
                    <option value="">All Conditions</option>
                    <option value="In-use">In-use</option>
                    <option value="In-store">In-store</option>
                    <option value="Spoiled">Spoiled</option>
                  </select>
                  <FunnelIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 
                                         pointer-events-none" 
                  />
                </div>
              )}

              {/* Search and Reset Buttons */}
              <button 
                onClick={onSearch} 
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white 
                           rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" /> 
                Search
              </button>

              <button 
                onClick={onReset} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white 
                           rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" /> 
                Reset
              </button>
            </div>

            {/* Records Per Page and Export */}
            <div className="flex flex-wrap items-center gap-3">
              {onRecordsPerPageChange && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 whitespace-nowrap">
                    Records per page:
                  </span>

                  <select
                    value={recordsPerPage}

                    onChange={e => {
                      onRecordsPerPageChange(+e.target.value)

                      /** Commented by Desmond @ 20-May-26: Pagination safety check
                       * In case the user is on pages like page 7 for instance,
                       * the user sets the number of records in one page from 10 to 100, 
                       * then the number of available pages decreases and page 7 is longer available.
                       * To avoid errors, this function was used to reset the user to 
                       * page 1 to avoid exceeding the total page number.
                       */
                      onPageChange(1)
                    }}

                    className="px-3 py-2 border border-gray-300 rounded-md 
                               focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {[10, 25, 50, 100].map(n => 
                    <option key={n} value={n}>
                      {n}
                    </option>)}
                  </select>

                </div>
              )}

              {/* Export button: Print to PDF, CSV and print QR and barcode in bulk */}
              {showExportButtons && (
                <div className="relative">
                  {/* The parent Print button */}
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 bg-white border border-gray-300 
                               rounded-md px-4 py-2 text-sm hover:bg-gray-50 
                               transition-colors"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
                    Print
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  {/* Show the export menu: Print to PDF, CSV or print QR and barcode */}
                  {showExportMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md 
                                      shadow-lg border border-gray-200 z-20"
                      >
                        <div className="py-1">
                          {/* Export to PDF */}
                          <button
                            onClick={() => handleExportSelection('pdf')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700
                                       hover:bg-gray-50 transition-colors"
                          >
                            Export to PDF
                          </button>

                          {/* Export to CSV */}
                          <button
                            onClick={() => handleExportSelection('csv')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 
                                       hover:bg-gray-50 transition-colors"
                          >
                            Export to CSV
                          </button>

                          {/* Print QR and barcode in bulk - only shown when onStartBulkPrint
                              is provided */}
                          {onStartBulkPrint && (
                            <>
                              <div className='border-t border-gray-100 my-1' />

                              {/* Button for the printing bulk QR or barcode */}
                              <button onClick={() => {
                                                onStartBulkPrint()
                                                setShowExportMenu(false)
                                              }}
                                      className='w-full text-let px-4 py-2 text-sm text-gray-700 
                                                 hover:bg-gray-50 transition-colors flex items-center gap-2'
                              >
                                {/* Button icon */}
                                <BulkPrintIcon className='h-4 w-4 text-gray-500'
                                               aria-hidden='true' 
                                />
                                
                                {/* Button label */}
                                {bulkPrintLabel}
                              </button>

                            </>
                          )}

                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      
      {/* Danger alert: Shown when checkbox selection hits limit ------------------- */}
      {codePrintType && showLimitAlert && (
        <div className='flex items-start sm:items-center p-4 mx-4 mt-3 text-sm
                        text-red-800 rounded-lg bg-red-50 border border-red-200'  
             role='alert'
             aria-live='assertive'             
        >
          {/* Information circle icon */}
          <InformationCircleIcon className='w-4 h-4 me-2 shrink-0 mt-0.5 sm:mt-0' />
          <p>
            <span className='font-semibold me-1'>
              Checkbox selection limit reached!
            </span>
            
            You can select a maximum of {maxSelectCount}{' '}
            {codePrintType === 'barcode' ? 'barcodes' : 'QR codes'} per A4 page.
            Please print the current selection before adding more.
          </p>
        </div>
      )}


      {/* Data table ---------------------------------------------------------------- */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 
                            border-red-600" 
            />
            <span className="ml-2 text-gray-600">
              Data table loading...
            </span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            {/* Table header ------------------------------------------------------- */}
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox header (to select/deselect all) - only visible in bulk-printing mode */}
                {codePrintType && (
                  <th className='px-4 py-3 w-10'>
                    <input type='checkbox' checked={selectedAllRow}
                           onChange={handleHeaderCheckbox}
                           aria-label='Select all visible rows'
                           className='rounded border-gray-300 text-red-600 focus:ring-red-500
                                      cursor-pointer'   
                    />
                  </th>
                )}

                {columns.map(col => (
                  <th key={col.key} onClick={() => col.sortable && onSort?.(col.key)}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-700
                                  uppercase tracking-wider ${col.sortable ? 
                                  'cursor-pointer hover:bg-gray-100 select-none' : ''
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {col.label}
                      </span>

                      {col.sortable && (
                        <span className="flex-shrink-0">
                          {sortBy === col.key ? (
                            sortOrder === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                            )
                          ) : (
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}

                {/* Actions table header ------------------------------------------ */}
                {actions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            {/* Table body -------------------------------------------------------- */}
            <tbody className="bg-white divide-y divide-gray-200">
              {/* When no data is available */}
              {data.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (actions ? 1 : 0)} 
                    className="py-12 text-center text-gray-500"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                // If table records are not empty
                data.map((row, i) => {
                  const rowId = String(row[primaryKey] ?? '')
                  const isSelected = selectedIds.has(rowId)
                  
                  return (
                    // Table row, if the checkbox beside it is selected, then it 
                    // is highlighted. Under normal circumstances, just give it a
                    // gray highlight when hovered over.
                    <tr key={i} className={`transition-colors
                                            ${isSelected ? 'bg-red-50 hover:bg-red-100' // Highlight the selected row
                                              : 'hover:bg-gray-50'}
                                          }`}
                    >

                    {/* Checkbox cell column -------------------------------------- */}
                    {codePrintType && (
                      <td className='px-4 py-4'>
                        <input type='checkbox' checked={isSelected}
                               onChange={() => {
                                  // Block more selections if limit is reached and the row
                                  // is not already selected
                                  if (!isSelected && selectedIds.size >= maxSelectCount) {
                                    return
                                  }

                                  // If it's not over the limit, allow the record's checbox
                                  // to be selected
                                  onToggleSelect?.(rowId)
                               }}
                               aria-label={`Select row ${rowId}`}
                               className='rounded border-gray-300 text-red-600
                                          focus:ring-red-500 cursor-pointer'
                        />
                      </td>
                    )}

                    {/* Record attributes displayed in the data table columns */}
                    {columns.map(col => (
                      // Removed whitespace-nowrap to allow text wrapping and prevent overflow issues - WC
                      <td key={col.key} className="px-6 py-4 text-sm text-black">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>

                    ))}

                    {/* Action buttons --------------------------------------------- */}
                    {actions && (
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <div className="flex gap-3">
                          {actions.onEdit && (
                            <button 
                              onClick={() => actions.onEdit!(row)} 
                              className="text-red-600 hover:text-red-900 font-medium transition-colors" 
                              title="Edit"
                            >
                              Edit
                            </button>
                          )}

                          {actions.onDelete && (
                            <button 
                              onClick={() => actions.onDelete!(row)} 
                              className="text-red-600 hover:text-red-900 font-medium transition-colors" 
                              title="Delete"
                            >
                              Delete
                            </button>
                          )}

                        </div>
                      </td>
                    )}
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && data.length > 0 && renderPagination()}
    </div>
  )
}
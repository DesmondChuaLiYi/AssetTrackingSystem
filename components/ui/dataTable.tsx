'use client'

import { useState, useEffect } from 'react'
import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, MagnifyingGlassIcon, ArrowPathIcon, DocumentArrowDownIcon, PlusIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps {
  title: string
  columns: Column[]
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
}

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
  actions
}: DataTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => setLocalSearchTerm(searchTerm), [searchTerm])

  const handleSearchChange = (v: string) => {
    setLocalSearchTerm(v)
    onSearchChange?.(v)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch?.()
  }

  const handleExportSelection = (type: 'pdf' | 'csv') => {
    if (type === 'pdf') {
      onExportPDF?.() // Always export all records
    } else if (type === 'csv') {
      onExportCSV?.() // Always export all records
    }
    setShowExportMenu(false)
  }

  const renderPagination = () => {
    const pages = []
    const max = 5
    let start = Math.max(1, currentPage - Math.floor(max / 2))
    let end = Math.min(totalPages, start + max - 1)
    if (end - start + 1 < max) start = Math.max(1, end - max + 1)

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
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
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-gray-200 gap-4">
        <span className="text-sm text-gray-700">
          {totalItems > 0 ? `Record ${startRecord} to ${endRecord} of ${totalItems}` : 'No records found'}
        </span>
        <div className="flex gap-1">
          <button 
            onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
            disabled={currentPage === 1 || totalPages === 0} 
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {pages}
          <button 
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
            disabled={currentPage === totalPages || totalPages === 0} 
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-4">
            {showAddButton && onAdd && (
              <button 
                onClick={onAdd} 
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4" /> {addButtonText}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="space-y-4">
          {/* Search Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchFields && searchFields.length >= 2 ? (
              <>
                {/* First search field from config (usually ID) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchFields[0].label}
                  </label>
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Second search field from config (usually Name) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchFields[1].label}
                  </label>
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Fallback to dynamic title-based search if no searchFields provided */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by {title.replace(' Listing', '')} ID
                  </label>
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by {title.replace(' Listing', '')} Name
                  </label>
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons and Filters */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Condition Filter */}
              {showConditionFilter && onConditionFilterChange && (
                <div className="relative">
                  <select
                    value={conditionFilter}
                    onChange={e => onConditionFilterChange(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-md appearance-none bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">All Conditions</option>
                    <option value="In-use">In-use</option>
                    <option value="In-store">In-store</option>
                    <option value="Spoiled">Spoiled</option>
                  </select>
                  <FunnelIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              )}

              {/* Search and Reset Buttons */}
              <button 
                onClick={onSearch} 
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" /> Search
              </button>
              <button 
                onClick={onReset} 
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                <ArrowPathIcon className="h-4 w-4" /> Reset
              </button>
            </div>

            {/* Records Per Page and Export */}
            <div className="flex flex-wrap items-center gap-3">
              {onRecordsPerPageChange && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 whitespace-nowrap">Records per page:</span>
                  <select
                    value={recordsPerPage}
                    onChange={e => onRecordsPerPageChange(+e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              )}

              {showExportButtons && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
                    Print
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  {showExportMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                        <div className="py-1">
                          <button
                            onClick={() => handleExportSelection('pdf')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Export to PDF
                          </button>
                          <button
                            onClick={() => handleExportSelection('csv')}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Export to CSV
                          </button>
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

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort?.(col.key)}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${
                      col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
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
                {actions && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
                data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
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
                ))
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
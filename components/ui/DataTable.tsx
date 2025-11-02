'use client'

import { useState, useEffect } from 'react'
import { ChevronUpIcon, ChevronDownIcon, MagnifyingGlassIcon, ArrowPathIcon, DocumentArrowDownIcon, PlusIcon, FunnelIcon } from '@heroicons/react/24/outline'

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
  onSearchChange?: (term: string) => void
  onSearch?: () => void
  onReset?: () => void
  onExportPDF?: () => void
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

  useEffect(() => setLocalSearchTerm(searchTerm), [searchTerm])

  const handleSearchChange = (v: string) => {
    setLocalSearchTerm(v)
    onSearchChange?.(v)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch?.()
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
          className={`px-3 py-2 text-sm rounded-md ${currentPage === i ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:bg-red-50'}`}
        >
          {i}
        </button>
      )
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t gap-4">
        <span className="text-sm text-gray-700">
          Record {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalItems)} of {totalItems}
        </span>
        <div className="flex gap-1">
          <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm bg-white border rounded-md disabled:opacity-50">Previous</button>
          {pages}
          <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm bg-white border rounded-md disabled:opacity-50">Next</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-4 sm:px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {showAddButton && onAdd && (
            <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm">
              <PlusIcon className="h-4 w-4" /> {addButtonText}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={localSearchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search..."
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            {showConditionFilter && onConditionFilterChange && (
              <div className="relative w-full sm:w-48">
                <select
                  value={conditionFilter}
                  onChange={e => onConditionFilterChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md appearance-none bg-white"
                >
                  <option value="">All Conditions</option>
                  <option value="In-use">In-use</option>
                  <option value="In-store">In-store</option>
                  <option value="Spoiled">Spoiled</option>
                </select>
                <FunnelIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onSearch} className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm">
                <MagnifyingGlassIcon className="h-4 w-4" /> Search
              </button>
              <button onClick={onReset} className="flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-md text-sm">
                <ArrowPathIcon className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            {onRecordsPerPageChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Records in page</span>
                <select
                  value={recordsPerPage}
                  onChange={e => onRecordsPerPageChange(+e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}

            {showExportButtons && (
              <div className="relative">
                <select
                  onChange={e => {
                    if (e.target.value === 'pdf') onExportPDF?.()
                    else if (e.target.value === 'csv') onExportCSV?.()
                    e.target.value = ''
                  }}
                  className="appearance-none bg-white border rounded-md px-4 py-2 pr-8 text-sm"
                >
                  <option value="">Print</option>
                  <option value="pdf">Export to PDF</option>
                  <option value="csv">Export to CSV</option>
                </select>
                <DocumentArrowDownIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div><span className="ml-2">Loading...</span></div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-red-50">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort?.(col.key)}
                    className={`px-6 py-3 text-left text-xs font-medium text-red-700 uppercase ${col.sortable ? 'cursor-pointer hover:bg-red-100' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortBy === col.key && (sortOrder === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />)}
                    </div>
                  </th>
                ))}
                {actions && <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length === 0 ? (
                <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="py-12 text-center text-gray-500">No data</td></tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i} className="hover:bg-red-50">
                    {columns.map(col => (
                      <td key={col.key} className="px-6 py-4 text-sm">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {actions.onEdit && <button onClick={() => actions.onEdit!(row)} className="text-red-600 hover:text-red-900" title="Edit">Edit</button>}
                          {actions.onDelete && <button onClick={() => actions.onDelete!(row)} className="text-red-600 hover:text-red-900" title="Delete">Delete</button>}
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

      {!loading && data.length > 0 && renderPagination()}
    </div>
  )
}
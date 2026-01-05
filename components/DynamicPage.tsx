'use client'

import { useState, useEffect } from 'react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import DataTable from '@/components/ui/DataTable'
import { configEasing } from 'recharts/types/animation/easing'

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
  addUrl: string // New: URL for add page
  editUrl: string // New: URL for edit page (will append ID)
}

interface FormFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number'
  required?: boolean
  disabled?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface DynamicPageProps {
  config: DynamicPageConfig
}

export default function DynamicPage({ config }: DynamicPageProps) {
  const { session, isLoading: sessionLoading } = useAdminAccess()
  const router = useRouter()

  const [data, setData] = useState<any[]>([])
  const [relatedData, setRelatedData] = useState<{ [key: string]: any[] }>({})
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState(config.searchFields[0]?.key || 'name')
  const [conditionFilter, setConditionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [sortBy, setSortBy] = useState(config.defaultSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [showModal, setShowModal] = useState(false)
  const [currentItem, setCurrentItem] = useState<any | null>(null)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted && session) {
      loadData()
      loadRelatedData()
    }
  }, [mounted, session, currentPage, recordsPerPage, sortBy, sortOrder, conditionFilter])

  // Initialize form data based on config
  useEffect(() => {
    const initialFormData: any = {}
    config.formFields.forEach(field => {
      if (field.key === config.primaryKey) {
        initialFormData[field.key] = ''
      } else if (field.type === 'select') {
        initialFormData[field.key] = field.options?.[0]?.value || ''
      } else {
        initialFormData[field.key] = ''
      }
    })
    setFormData(initialFormData)
  }, [config])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })
      const res = await fetch(`${config.apiEndpoint}?${params}`)
      if (!res.ok) throw new Error()
      const responseData = await res.json()
      setData(responseData.data)
      setTotalItems(responseData.totalItems)
      setTotalPages(responseData.totalPages)
    } catch (e) {
      alert(`Failed to load ${config.entityDisplayName.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedData = async () => {
    // Load related data for dropdowns (locations, departments)
    const relatedEndpoints = {
      locations: '/api/location',
      departments: '/api/department'
    }

    const newRelatedData: { [key: string]: any[] } = {}

    for (const [key, endpoint] of Object.entries(relatedEndpoints)) {
      try {
        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          newRelatedData[key] = data.data || []
        }
      } catch (e) {
        console.error(`Failed to load ${key}:`, e)
      }
    }

    setRelatedData(newRelatedData)
  }

  const handleSearch = () => { setCurrentPage(1); loadData() }
  const handleReset = () => {
    setSearchTerm('')
    setSearchField(config.searchFields[0]?.key || 'name')
    setConditionFilter('')
    setCurrentPage(1)
    setSortBy(config.defaultSortBy)
    setSortOrder('desc')
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('asc') }
  }

  const handleAdd = () => {
    router.push(config.addUrl)
  }

  const handleEdit = (item: any) => {
    router.push(`${config.editUrl}/${item[config.primaryKey]}`)
  }

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.name || item[config.primaryKey]}"?`)) return
    const res = await fetch(`${config.apiEndpoint}?${config.primaryKey}=${item[config.primaryKey]}`, { method: 'DELETE' })
    if (res.ok) { alert('Deleted successfully'); loadData() } else alert('Failed to delete')
  }

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = config.formFields.filter(field => field.required)
    for (const field of requiredFields) {
      if (!formData[field.key]) {
        return alert(`Please fill in ${field.label}`)
      }
    }

    const res = await fetch(config.apiEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (res.ok) {
      alert(`${config.entityDisplayNameSingular} updated successfully!`)
      setShowModal(false)
      loadData()
    } else {
      alert(`${config.entityDisplayNameSingular} update failed!`)
    }
  }

  const handleExportPDF = async () => {
    if (typeof window === 'undefined') return

    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '999999',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })

      let dataToExport = data
      let totalRecords = totalItems

      const res = await fetch(`${config.apiEndpoint}?${params}`)
      if (res.ok) {
        const responseData = await res.json()
        dataToExport = responseData.data
        totalRecords = responseData.totalItems
      }

      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      doc.setFontSize(18)
      doc.text('Asset Tracking System', 14, 20)
      doc.setFontSize(14)
      doc.text(`${config.entityDisplayName} Report`, 14, 30)

      let yPosition = 40
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
      yPosition += 6
      doc.text(`Total ${config.entityDisplayName}: ${totalRecords}`, 14, yPosition)
      yPosition += 6

      if (searchTerm) {
        doc.text(`Search Filter: ${searchField} = "${searchTerm}"`, 14, yPosition)
        yPosition += 6
      }

      if (conditionFilter) {
        doc.text(`Condition Filter: ${conditionFilter}`, 14, yPosition)
        yPosition += 6
      }

      const tableColumn = config.columns.map(col => col.label)
      const tableRows = dataToExport.map((item, index) => {
        return config.columns.map(col => {
          if (col.render && typeof col.render === 'function') {
            const rendered = col.render(item[col.key], item)
            return typeof rendered === 'string' ? rendered : item[col.key] || ''
          }
          return item[col.key] || ''
        })
      })

      autoTable(doc, {
        startY: yPosition + 5,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        }
      })

      const fileName = `${config.entityName}-report-${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF. Error: ' + (error as Error).message)
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '999999',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })

      const res = await fetch(`${config.apiEndpoint}?${params}`)

      if (!res.ok) {
        throw new Error(`Failed to fetch ${config.entityDisplayName.toLowerCase()} data`)
      }

      const responseData = await res.json()
      const dataToExport = responseData.data || []

      if (dataToExport.length === 0) {
        alert('No data to export')
        return
      }

      const headers = ['No.', ...config.columns.map(col => col.label)]
      const rows = dataToExport.map((item: any, index: number) => {
        const row: string[] = [(index + 1).toString()]
        config.columns.forEach(col => {
          if (col.render && typeof col.render === 'function') {
            const rendered = col.render(item[col.key], item)
            row.push(typeof rendered === 'string' ? `"${rendered}"` : `"${item[col.key] || 'N/A'}"`)
          } else {
            row.push(`"${item[col.key] || 'N/A'}"`)
          }
        })
        return row
      })

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${config.entityName}-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('CSV export failed:', error)
      alert('Failed to export CSV: ' + (error as Error).message)
    }
  }

  const renderFormField = (field: FormFieldConfig) => {
    const value = formData[field.key] || ''

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            rows={3}
            disabled={field.disabled}
            placeholder={field.placeholder}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
          />
        )
      case 'select':
        return (
          <select
            value={value}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            disabled={field.disabled}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
            {/* Dynamic options for locations/departments */}
            {field.key === 'location_id' && relatedData.locations?.map((location: any) => (
              <option key={location.location_id} value={location.location_id}>{location.name}</option>
            ))}
            {field.key === 'department_id' && relatedData.departments?.map((department: any) => (
              <option key={department.department_id} value={department.department_id}>{department.name}</option>
            ))}
          </select>
        )
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            disabled={field.disabled}
            placeholder={field.placeholder}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
          />
        )
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
            disabled={field.disabled}
            placeholder={field.placeholder}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
          />
        )
    }
  }

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

  // Remove handleSave and renderFormField functions as they're no longer needed

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb />

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{config.pageTitle}</h1>
            <p className="text-gray-600 mt-1">{config.pageDescription}</p>
          </div>

          <DataTable
            title={`${config.entityDisplayName} Listing`}
            columns={config.columns}
            data={data}
            loading={loading}
            searchTerm={searchTerm}
            searchField={searchField}
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
            actions={{ onEdit: handleEdit, onDelete: handleDelete }}
            showAddButton={config.showAddButton}
            onAdd={handleAdd}
          />
        </div>
      </main>
      {/* Remove modal JSX */}
    </div>
  )
}
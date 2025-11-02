'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/SessionProvider'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import DataTable from '@/components/ui/DataTable'

interface Asset {
  asset_id: string
  name: string
  model: string
  description: string
  condition: string
  location_id: string
  department_id: string
  category: string
  created_dt: string
  updated_dt: string
  location?: { name: string }
  department?: { name: string }
}

interface Location {
  location_id: string
  name: string
}

interface Department {
  department_id: string
  name: string
}

interface FormData {
  asset_id: string
  name: string
  model: string
  description: string
  condition: string
  location_id: string
  department_id: string
  category: string
}

export default function AssetsPage() {
  const { session } = useSession()
  const router = useRouter()

  const [assets, setAssets] = useState<Asset[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState('name')
  const [conditionFilter, setConditionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [sortBy, setSortBy] = useState('created_dt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [showModal, setShowModal] = useState(false)
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null)
  const [formData, setFormData] = useState<FormData>({
    asset_id: '',
    name: '',
    model: '',
    description: '',
    condition: 'In-use',
    location_id: '',
    department_id: '',
    category: ''
  })

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (mounted && !session) router.push('/')
  }, [mounted, session, router])

  useEffect(() => {
    if (mounted && session) {
      loadAssets()
      loadLocations()
      loadDepartments()
    }
  }, [mounted, session, currentPage, recordsPerPage, sortBy, sortOrder, conditionFilter])

  const loadAssets = async () => {
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
      const res = await fetch(`/api/assets?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAssets(data.data)
      setTotalItems(data.totalItems)
      setTotalPages(data.totalPages)
    } catch (e) {
      alert('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    const res = await fetch('/api/locations')
    if (res.ok) setLocations((await res.json()).data || [])
  }

  const loadDepartments = async () => {
    const res = await fetch('/api/departments')
    if (res.ok) setDepartments((await res.json()).data || [])
  }

  const handleSearch = () => { setCurrentPage(1); loadAssets() }
  const handleReset = () => {
    setSearchTerm(''); setConditionFilter(''); setCurrentPage(1)
    setSortBy('created_dt'); setSortOrder('desc')
  }
  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('asc') }
  }

  const handleEdit = (asset: Asset) => {
    setCurrentAsset(asset)
    setFormData({ ...asset })
    setShowModal(true)
  }

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.name}"?`)) return
    const res = await fetch(`/api/assets?asset_id=${asset.asset_id}`, { method: 'DELETE' })
    if (res.ok) { alert('Deleted'); loadAssets() } else alert('Failed')
  }

  const handleSave = async () => {
    if (!formData.name || !formData.model || !formData.category || !formData.location_id || !formData.department_id)
      return alert('Fill required fields')
    const res = await fetch('/api/assets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    if (res.ok) { alert('Saved'); setShowModal(false); loadAssets() } else alert('Failed')
  }

  const handleExportPDF = async () => {
    if (typeof window === 'undefined') return

    try {
      // Always fetch all records for PDF export
      const params = new URLSearchParams({
        page: '1',
        limit: '999999', // Get all records
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })
      
      let dataToExport = assets
      let totalRecords = totalItems
      
      const res = await fetch(`/api/assets?${params}`)
      if (res.ok) {
        const data = await res.json()
        dataToExport = data.data
        totalRecords = data.totalItems
      }

      // Import jsPDF first
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default
      
      // Import autoTable - this extends jsPDF prototype
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default
      
      // Create document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Add header
      doc.setFontSize(18)
      doc.text('Asset Tracking System', 14, 20)
      
      doc.setFontSize(14)
      doc.text('Asset Listing Report', 14, 30)

      // Add metadata
      let yPosition = 40
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
      yPosition += 6
      doc.text(`Total Assets: ${totalRecords}`, 14, yPosition)
      yPosition += 6
      doc.text(`Report Type: Complete Asset List`, 14, yPosition)
      yPosition += 6
      
      if (searchTerm) {
        doc.text(`Search Filter: ${searchField} = "${searchTerm}"`, 14, yPosition)
        yPosition += 6
      }
      
      if (conditionFilter) {
        doc.text(`Condition Filter: ${conditionFilter}`, 14, yPosition)
        yPosition += 6
      }

      // Prepare table data
      const tableColumn = [
        'No.',
        'Asset ID',
        'Name',
        'Model',
        'Category',
        'Condition',
        'Location',
        'Department'
      ]

      const tableRows = dataToExport.map((asset, index) => [
        (index + 1).toString(),
        asset.asset_id || '',
        asset.name || '',
        asset.model || '',
        asset.category || '',
        asset.condition || '',
        asset.location?.name || 'N/A',
        asset.department?.name || 'N/A'
      ])

      // Generate table using autoTable
      autoTable(doc, {
        startY: yPosition + 5,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 38, 38], // Red color to match your theme
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 12 }, // No.
          1: { cellWidth: 23 }, // Asset ID
          2: { cellWidth: 38 }, // Name
          3: { cellWidth: 32 }, // Model
          4: { cellWidth: 28 }, // Category
          5: { cellWidth: 23 }, // Condition
          6: { cellWidth: 33 }, // Location
          7: { cellWidth: 33 }  // Department
        },
        margin: { top: 10, bottom: 20 },
        didDrawPage: function(data: any) {
          // Add page numbers to footer
          const pageSize = doc.internal.pageSize
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
          const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()
          
          doc.setFontSize(8)
          doc.setTextColor(128)
          
          const currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber
          const footerText = `Page ${currentPageNum}`
          
          doc.text(
            footerText,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          )
          
          // Add timestamp
          doc.text(
            `Generated: ${new Date().toLocaleString()}`,
            14,
            pageHeight - 10
          )
        }
      })

      // Save the PDF with timestamp
      const fileName = `asset-report-${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(fileName)
      
      console.log('PDF generated successfully:', fileName)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF. Error: ' + (error as Error).message)
    }
  }

  const handleExportCSV = async () => {
    try {
      // Always fetch all records for CSV export
      const params = new URLSearchParams({
        page: '1',
        limit: '999999',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm, searchField }),
        ...(conditionFilter && { condition: conditionFilter })
      })
      
      const res = await fetch(`/api/assets?${params}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch assets data')
      }
      
      const data = await res.json()
      const dataToExport = data.data || []
      
      if (dataToExport.length === 0) {
        alert('No data to export')
        return
      }
      
      const headers = ['No.', 'Asset ID', 'Name', 'Model', 'Category', 'Condition', 'Location', 'Department']
      const rows = dataToExport.map((a: Asset, index: number) => [
        index + 1,
        a.asset_id,
        `"${a.name}"`,
        `"${a.model}"`,
        `"${a.category}"`,
        a.condition,
        `"${a.location?.name || 'N/A'}"`,
        `"${a.department?.name || 'N/A'}"`
      ])
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      
      console.log(`CSV export successful: ${dataToExport.length} records exported`)
    } catch (error) {
      console.error('CSV export failed:', error)
      alert('Failed to export CSV: ' + (error as Error).message)
    }
  }

  if (!mounted || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const columns = [
    { key: 'asset_id', label: 'Asset ID', sortable: true, render: (v: string) => <span className="font-medium text-blue-600">{v}</span> },
    { key: 'name', label: 'Asset Name', sortable: true },
    { key: 'model', label: 'Model', sortable: false },
    { key: 'category', label: 'Category', sortable: false },
    {
      key: 'condition', label: 'Condition', sortable: false,
      render: (v: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          v === 'In-use' ? 'bg-green-100 text-green-800' :
          v === 'In-store' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>{v}</span>
      )
    },
    { key: 'location', label: 'Location', sortable: false, render: (_: any, row: Asset) => row.location?.name || 'N/A' },
    { key: 'department', label: 'Department', sortable: false, render: (_: any, row: Asset) => row.department?.name || 'N/A' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Assets</h1>
          <p className="text-sm text-gray-600">Manage and track your organisation's assets</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DataTable
          title="Asset Listing"
          columns={columns}
          data={assets}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          onReset={handleReset}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          showConditionFilter={true}
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
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Asset</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Asset ID</label><input value={formData.asset_id} disabled className="mt-1 block w-full px-3 py-2 border rounded-md bg-gray-100" /></div>
              <div><label className="block text-sm font-medium">Name *</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium">Model *</label><input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium">Description</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="mt-1 block w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium">Category *</label><input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md" /></div>
              <div><label className="block text-sm font-medium">Condition</label>
                <select value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md">
                  <option value="In-use">In-use</option>
                  <option value="In-store">In-store</option>
                  <option value="Spoiled">Spoiled</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium">Location *</label>
                <select value={formData.location_id} onChange={e => setFormData({ ...formData, location_id: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md">
                  <option value="">Select</option>
                  {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium">Department *</label>
                <select value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md">
                  <option value="">Select</option>
                  {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white rounded-md">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
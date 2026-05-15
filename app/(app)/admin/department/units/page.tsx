// app\(app)\admin\department\units\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file department/units/page.tsx
 * @description The department listing page for the admin module
 * 
 * Shows a paginated, searchable and sortable table for all the departments in campus
 * Admins can add, edit or soft-delete department records using this page
 * 
 * The page name is "units" and not "departments" because it sits inside the
 * /admin/department/ folder - having a subfolder also called the same name would be
 * redundant. Therefore, "units" is used to describe the department units
 * 
 * All rendering, search, sort, pagination and CRUD actions are handled by dynamicPage
 * This file only provides the configuration for dynamicPage to render the form
 * 
 * Related files
 *   - components/dynamicPage.tsx : Generic dynamic page component that also displays a data table
 *   - app/(app)/admin/department/addDepartment/ : Add form for departments
 *   - app/(app)/admin/department/editDepartment/[id]/ : Edit form for departments
 *   - app/api/department.route.ts : GET/POST/DELETE operations are in this file
 *   - app/api/department/[id]/route.ts : GET (read) and PUT (update) for single record
 *   - app/scan/location/[id]/route.ts : QR redirect handler
 * 
 * Commented by Desmond @ 30-April-26
 * Added to this iteration:
 *   - QR code thumbnail column to display the QR code image without leaking Supabase
 *     bucket credentials through the browser URL
 *   - Clicking the QR thumbnail opens the IdCodeModal with Print an Save buttons
 *   - Soft delete support where the API sets deleted_dt on DELETE, instead of removing
 *     the record entirely from the DB, to maintain audit trails
*/
// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useState } from 'react'
import DynamicPage from '@/components/dynamicPage'
import type { dynamicPageConfig } from '@/components/dynamicPage'
import { supabase } from '@/lib/supabase/client'
import IdCodeModal from '@/components/ui/idCodeModal'

/** --------------------- QR thumbnail -----------------------------
 * Department QR thumbnail
 *
 * @param tagPath - Relative storage path from department.tag_path
 * @param departmentId - department_id — passed to the modal header
 * @param name - Department name — friendly label in the modal
 * @param onOpen - Callback to open the modal
 */
function QrThumbnail({tagPath, departmentId, name, onOpen}: {
  tagPath: string | null
  departmentId: string
  name?: string
  onOpen: (tagPath: string, departmentId: string, label?: string) => void
}) {
  if (!tagPath) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        No QR
      </span>
    )
  }

  const { data } = supabase.storage
    .from('IdCodes')
    .getPublicUrl(tagPath)

  const url = data?.publicUrl ?? null

  if (!url) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        No QR
      </span>
    )
  }

  return (
    <button type="button" onClick={() => onOpen(tagPath, departmentId, name)}
            title="Click to view, print or save QR code"
            // Green border/focus ring to differentiate department QRs from location QRs (blue)
            className="inline-block rounded border border-gray-200 hover:border-green-500 transition-colors 
                       focus:outline-none focus:ring-2 focus:ring-green-500 bg-white p-0.5"
    >
      <img src={url} alt={`QR code for department ${departmentId}`} width={48} height={48}
           className="object-contain rounded"
           onError={() => console.error('[UnitsPage] QR thumbnail failed for', departmentId)}
      />
    </button>
  )
}

// ----------------- Export the page component -----------------
export default function DepartmentPage() {
  // Passes the config to dynamicPage which handles the logic and form data
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  const [modal, setModal] = useState<{
    tagPath: string
    departmentId: string
    label?: string
  } | null>(null)

  const openModal = (tagPath: string, departmentId: string, label?: string) =>
    setModal({ tagPath, departmentId, label })

  const closeModal = () => setModal(null)

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  // ----------------- Department listing page configuration for dynamicPage ----------------
  // dynamicPageConfig is added here so that TypeScript can validate the config
  // before passing to dynamicPage
  const config: dynamicPageConfig = {
    entityName: 'department',
    entityDisplayName: 'Department',
    entityDisplayNameSingular: 'Department',
    // API route for fetching the paginated list of departments
    apiEndpoint: '/api/department',
    // Primary key to fetch, update and delete records
    primaryKey: 'department_id',
    pageTitle: 'Departments',
    pageDescription: 'Manage departments in Swinburne',
    defaultSortBy: 'created_dt',
    showAddButton: true,
    // This file do not have a condition field, unlike asset
    showConditionFilter: false,
    // URL for the dynamicAdd and dynamicEdit page
    addUrl: '/admin/department/addDepartment',
    editUrl: '/admin/department/editDepartment',
    // Two search boxes above the table
    searchFields: [
      { key: 'department_id', label: 'Search by Department ID' },  // First field - will be left search box
      { key: 'name', label: 'Search by Department Name' }     // Second field - will be right search box
    ],

    // -------------------- Data table columns ----------------------
    columns: [
      // ------------------- department_id (PK) ---------------------
      { 
        key: 'department_id', 
        label: 'Department ID', 
        sortable: true 
      },

      // ----------------- tag_path (QR code thumbnail) ----------------------    
        {
          key: 'tag_path',
          label: 'QR Code',
          sortable: false,
          render: (value: unknown, row: Record<string, unknown>) => (
            <QrThumbnail
              tagPath={typeof value === 'string' ? value : null}
              departmentId={String(row.department_id ?? '')}
              name={typeof row.name === 'string' ? row.name : undefined}
              onOpen={openModal}
            />
          ),
        },

      // --------------------- name ---------------------
      { 
        key: 'name', 
        label: 'Name', 
        sortable: true 
      },

      // -------------------- block --------------------
      { 
        key: 'block', 
        label: 'Block', 
        sortable: true 
      },

      // -------------------- level --------------------
      { 
        key: 'level', 
        label: 'Level', 
        sortable: true 
      },

      // ------------------ created_dt -------------------
      {
        key: 'created_dt', label: 'Created Date', sortable: true,
        render: (value: unknown) => new Date(String(value)).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      }

    ],
    // ----------------------- Form fields for add/edit pages --------------------
    formFields: [
      // --------------------- department_id (PK) ---------------------
      { 
        key: 'department_id', 
        label: 'Department ID', 
        type: 'text', 
        required: true 
      },

      // ---------------------- name ----------------------------
      { 
        key: 'name', 
        label: 'Name', 
        type: 'text', 
        required: true 
      },

      // --------------------- block -----------------------
      { 
        key: 'block', 
        label: 'Block', 
        type: 'text' 
      },

      // ------------------- level --------------------
      { 
        key: 'level', 
        label: 'Level', 
        type: 'number' 
      }
    ]
  }

  return (
    <>
      <DynamicPage config={config} />

       {modal && (
        <IdCodeModal
          isOpen={true}
          onClose={closeModal}
          tagPath={modal.tagPath}
          entityType="department"
          entityId={modal.departmentId}
          entityLabel={modal.label}
        />
      )}
    </>
  )
}
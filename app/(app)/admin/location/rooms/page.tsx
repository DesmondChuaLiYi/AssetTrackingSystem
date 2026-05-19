// app\(app)\admin\location\rooms\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file location/rooms/page.tsx
 * @description The location listing page for the admin module
 * 
 * This file shows a paginated, searchable, sortable table of all locations in Swinburne
 * Again, a "location" represents a physical room or space in the campus
 * e.g., "Room G-001", "Computer Lab B-204", "Server Room Level 3"
 * Generally, the id for these rooms are short, such as "G001" or "B504"
 * 
 * The page is named "rooms" (not "locations") because it lives inside the
 * /admin/location/ folder. "Rooms" describes the type of location in the campus
 * without repeating the word "location" in the URL path
 * 
 * Admins can add, edit or soft-delete locations using this page
 * Deleting a location that has assets assigned to it will produce FK errors
 * unless the assets are reassigned first then remove the location_id previously
 * associated to it
 * 
 * All table rendering and actions are handled by dynamicPage
 * 
 * Related files
 *   - components/dynamicPage.tsx : Generic table component displayed using the dynamicPage
 *   - app/(app)/admin/location/addLocation : Add form using dynamicAdd to create new location records
 *   - app/(app)/admin/location/editLocation/[id] : Edit form using dynamicEdit to edit existing location records
 *   - app/api/location/route.ts : GET (read) / POST (create) / DELETE (well, delete)
 *   - app/scan/location/[id]/route.ts : QR redirect handler
 * 
 * Commented by Desmond @ 30-April-26
 * Added in this iteration:
 *   - QR code thumbnail column which renders the stored QR image from Supabase storage
 *   - Clicking the QR thumbnail opens IdCodeModal with Print and Save buttons
 *   - Soft deleting where DELETE now sets deleted_dt (which marks the record as soft deleted)
 */
// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useState } from 'react'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicPage from '@/components/dynamicPage'
import type { dynamicPageConfig } from '@/components/dynamicPage'
import { supabase } from '@/lib/supabase/client'
import IdCodeModal from '@/components/ui/idCodeModal'

// ------------------------ QR thumbnail -------------------------
/**
 * Small QR code thumbnail shown in the location table.
 * Clicking it opens IdCodeModal for print/save — does NOT open a new tab.
 *
 * @param tagPath    - Relative storage path from location.tag_path DB column
 * @param locationId - location_id — passed to the modal header
 * @param name       - Location name — friendly label in the modal
 * @param onOpen     - Callback to open the modal with this location's data
 */
function QrThumbnail({tagPath, locationId, name, onOpen}: {
  tagPath: string | null
  locationId: string
  name?: string
  onOpen: (tagPath: string, locationId: string, label?: string) => void
}) {
  if (!tagPath) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        No QR
      </span>
    )
  }

  // Resolve public URL via SDK — never hardcoded
  const { data } = supabase.storage.from('IdCodes').getPublicUrl(tagPath)
  const url = data?.publicUrl ?? null

  if (!url) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        No QR
      </span>
    )
  }

  return (
    <button type="button" onClick={() => onOpen(tagPath, locationId, name)}
      title="Click to view, print or save QR code"
      className="inline-block rounded border border-gray-200 hover:border-blue-400 
      transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white p-0.5"
    >
      <img src={url} alt={`QR code for ${locationId}`} width={48} height={48}
        className="object-contain rounded"
        onError={() => console.error('[RoomsPage] QR thumbnail failed for', locationId)}
      />
    </button>
  )
}

// ------------------ Export the location listing page component ---------------
export default function LocationRoomsPage() {
  // Passes the config to dynamicPage which handles the logic and form data
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Modal state
  const [modal, setModal] = useState<{
    tagPath: string
    locationId: string
    label?: string
  } | null>(null)

  const openModal = (tagPath: string, locationId: string, label?: string) =>
    setModal({ tagPath, locationId, label })

  const closeModal = () => setModal(null)

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  // -------------------- Dynamic page configuration for location listing ---------------------
// TypeScript will now catch config errors before it is rendered in dynamicAdd
const config: dynamicPageConfig = {
  entityName: 'location',
  entityDisplayName: 'Location',
  entityDisplayNameSingular: 'Location',
  // API route for the location
  apiEndpoint: '/api/location',
  // Primary key to fetch, update and delete location records
  primaryKey: 'location_id',
  pageTitle: 'Locations',
  pageDescription: 'Manage places, rooms and locations in Swinburne',
  defaultSortBy: 'created_dt',
  // Display the add button
  showAddButton: true,
  // Do not display the condition filter meant for asset page
  showConditionFilter: false,
  // URL for the add and edit action buttons
  addUrl: '/admin/location/addLocation',
  editUrl: '/admin/location/editLocation',

  // Two search boxes rendered above the data table for location
  searchFields: [
    { key: 'location_id', label: 'Search by Location ID' },  // First field - will be left search box
    { key: 'name', label: 'Search by Location Name' }     // Second field - will be right search box
  ],

  // ----------------------- Table columns for the data table ---------------------
  columns: [
    // -------------------- location_id (PK) -----------------------
    { 
      key: 'location_id', 
      label: 'Location ID', 
      sortable: true 
    },

    // ---------------------- tag_path --------------------------------
    {
      key: 'tag_path',
      label: 'QR Code',
      sortable: false,
      render: (value: unknown, row: Record<string, unknown>) => (
        <QrThumbnail
          tagPath={typeof value === 'string' ? value : null}
          locationId={String(row.location_id ?? '')}
          name={typeof row.name === 'string' ? row.name : undefined}
          onOpen={openModal}
        />
      )
    },

    // ------------------------ name -----------------------
    { key: 'name', 
      label: 'Name', 
      sortable: true 
    },

    // ---------------------- description ----------------------
    { 
      key: 'description', 
      label: 'Description', 
      sortable: true 
    },

    // ----------------------- block ------------------------
    { 
      key: 'block', 
      label: 'Block', 
      sortable: true 
    },

    // ------------------------ level -----------------------
    { 
      key: 'level', 
      label: 'Level', 
      sortable: true 
    },
    
    // ----------------------- created_dt --------------------
    {
      key: 'created_dt', label: 'Created Date', sortable: true,
      render: (value: unknown) => new Date(String(value)).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  ],

  // --------------------------- Form fields ----------------------------
  formFields: [
    // ------------------- location_id (PK) -----------------------
    { 
      key: 'location_id', 
      label: 'Location ID', 
      type: 'text' as const, 
      required: true 
    },

    // ----------------------- name ----------------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true 
    },

    // -------------------- description -------------------------
    { 
      key: 'description', 
      label: 'Description', 
      type: 'textarea' as const 
    },
    
    // ------------------- block -------------------
    { 
      key: 'block', 
      label: 'Block', 
      type: 'text' as const 
    },

    // ------------------- level ---------------------
    { 
      key: 'level', 
      label: 'Level', 
      type: 'number' as const 
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
          entityType="location"
          entityId={modal.locationId}
          entityLabel={modal.label}
        />
      )}
    </>
  )
}
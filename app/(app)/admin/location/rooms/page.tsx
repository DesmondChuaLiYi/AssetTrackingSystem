// app\(app)\admin\location\rooms\page.tsx
'use client'

// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
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
 */
import DynamicPage from '@/components/dynamicPage'
import type { dynamicPageConfig } from '@/components/dynamicPage'

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

// ------------------ Export the location listing page component ---------------
export default function LocationRoomsPage() {
  // Passes the config to dynamicPage which handles the logic and form data
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  return <DynamicPage config={config} />
}
// app\(app)\admin\location\addLocation\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file addLocation/page.tsx
 * @description Add form page for creating a new location/room record in Swinburne
 * 
 * This page is reached by clicking the "Add" button in the location listing dynamic page
 * A location represents a physical room or space in Swinburne campus
 * (e.g., "Tutorial Room G-001", "Lab B-213", "Server Room Level 3")
 * 
 * The location_id is entered manually and should be a short and unique code that physically
 * identifies the space or room, such as "G001" or "B504"
 * This id is what gets encoded into the QR code sticker attached to the room so that
 * user can scan the QR code and be redirected to the web app to tag assets to a location
 * without first needing to open the web app
 * 
 * All form logic, validation and submission are handled by dynamicAdd
 * This file only defines what the form should look like, what field it has
 * 
 * Related files
 *   - components/dynamicAdd.tsx : Generic add form component
 *   - app/api/location/route.ts : POST endpoint for creating new location records
 *   - app/(app)/admin/location/rooms/page.tsx : The listing page for locations
 */
// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicAdd from '@/components/dynamicAdd'
import type { dynamicAddConfig } from '@/components/dynamicAdd'

// ------------------- Add location form configurations -----------------------
// TypeScript will now catch config errors before it is rendered in dynamicAdd
const addLocationConfig: dynamicAddConfig = {
  entityName: 'location',
  entityDisplayName: 'Locations',
  entityDisplayNameSingular: 'Location',
  // API route that handles the POST request to create a new location record
  apiEndpoint: '/api/location',
  // Primary key to fetch, update or soft-delete a location record
  primaryKey: 'location_id',
  pageTitle: 'Add Location',
  // URL to go to after creating or cancelling adding a new location record
  backUrl: '/admin/location/rooms',

  // ---------------------- Form fields for dynamicAdd ----------------------
  formFields: [
    // -------------------- location_id (PK) -----------------------
    {
      key: 'location_id',
      label: 'Location ID',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter location code (e.g., G001, B504, LAB-ICT)'
    },

    // ---------------------- name ---------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true,
      placeholder: 'e.g., Room G-001, Server Room'
    },

    // ------------------- description ----------------------
    { 
      key: 'description', 
      label: 'Description', 
      type: 'textarea' as const,
      placeholder: 'Brief description about the location (max 30 characters)'
    },

    // --------------------- block -----------------
    { 
      key: 'block', 
      label: 'Block', 
      type: 'text' as const,
      placeholder: 'e.g., A, B, C'
    },

    // --------------------- level --------------------
    { 
      key: 'level', 
      label: 'Level', 
      type: 'number' as const,
      placeholder: 'e.g., 1, 2, 3'
    }
  ]
}

// --------------------- Export the add location page component --------------------
export default function AddLocationPage() {
  // Passes the config to dynamicAdd which handles the logic and form data
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  return <DynamicAdd config={addLocationConfig} />
}

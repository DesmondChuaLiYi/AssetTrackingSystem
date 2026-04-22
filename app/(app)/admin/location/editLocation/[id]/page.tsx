// app\(app)\admin\location\editLocation\[id]\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file editLocation/[id]/page.tsx
 * @description Edit form page for a single location record
 * 
 * This page is reached by clicking "Edit" on any row in the location listing dynamic page
 * The location's ID is embedded in the URL
 *   - /admin/location/editLocation/G001
 * 
 * All form rendering, data loading and saving are handled by dynamicEdit
 * This file defines the configuration and safely extracts the ID from the URL
 * 
 * Related files
 *   - components/dynamicEdit.tsx : Generic edit form page for location
 *   - app/api/location/[id]/route.ts : GET (read) and PUT (update) for one location
 *   - app/(app)/admin/location/rooms/page.tsx : The location listing page using dynamicPage
 */
import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'
import type { DynamicEditConfig } from '@/components/dynamicEdit'

// ------------------------ Edit form configuration -------------------------
// TypeScript will now catch config errors before it is rendered in dynamicEdit
const editLocationConfig: DynamicEditConfig = {
  entityName: 'location',
  entityDisplayName: 'Locations',
  entityDisplayNameSingular: 'Location',
  // API route for handling location records
  apiEndpoint: '/api/location',
  // Primary key to fetch, update or delete location records
  primaryKey: 'location_id',
  pageTitle: 'Edit Location',
  // URL to go to after editing or cancelling edit location
  backUrl: '/admin/location/rooms',

  // ----------------------- Form fields ---------------------------
  formFields: [
    // --------------------- location_id (PK) -------------------
    {
      key: 'location_id',
      label: 'Location ID',
      type: 'text' as const,
      required: true,
      // Disabled so that users cannot alter the primary key value
      disabled: true
    },

    // ----------------------- name ---------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true 
    },

    // -------------------- description -------------------
    { 
      key: 'description', 
      label: 'Description', 
      type: 'textarea' as const 
    },
    
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

// ---------------------- Export the location page component --------------------
export default function EditLocationPage() {
  const params = useParams()

  // This extracts the id safely
  // If the ID is an array, like ["G001"], then we take the first array value - "G001"
  // Otherwise, if it is a string, take it as it is - "G001"
  // Else, if it is null, then give empty ' '
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '')

  // Passes the config to dynamicEdit which handles the logic and form data
  return <DynamicEdit config={editLocationConfig} recordId={id} />
}
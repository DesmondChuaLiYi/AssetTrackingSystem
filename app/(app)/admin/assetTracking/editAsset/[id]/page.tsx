// app\(app)\admin\assetTracking\editAsset\[id]\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file editAsset/[id]/page.tsx
 * @description Edit form page for a single asset record.
 * 
 * This page reads the asset_id from the URL, then render the dynamicEdit
 * component which fetches the existing record and fills the form fields.
 * Admins can update any field except asset_id.
 * 
 * URL pattern: /admin/assetTracking/editAsset/ICT-LAPTOP-001
 *   The asset_id that is passed to dynamicEdit is ICT-LAPTOP-001
 * 
 * Related files:
 *   - components/dynamicEdit.tsx : Dynamic edit form component
 *   - app/api/assets/[id]/route.ts : GET (fetch) and PUT (update) endpoints
 *   - app/(app)/admin/assetTracking/assets/page.tsx : Dynamic page which shows the listing of assets
 */
// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'
import type { dynamicEditConfig } from '@/components/dynamicEdit'

// Commented by Desmond @ 22-April-26
// This is the configuration for the edit asset form
// Difference from the addAsset/page.tsx is 
//  - asset_id disabled: true : Prevents the primary key from being changed after creation
const editAssetConfig: dynamicEditConfig = {
  entityName: 'asset',
  entityDisplayName: 'Assets',
  entityDisplayNameSingular: 'Asset',
  // API endpoint for edit asset where dynamicEdit calls GET /api/assets/[id] and 
  // PUT /api/assets/[id]
  apiEndpoint: '/api/assets',
  // Primary key where dynamicEdit fetches the record using this key
  primaryKey: 'asset_id',
  pageTitle: 'Edit Asset',
  // The URL dynamicEdit goes back to after editing or cancelling edit
  backUrl: '/admin/assetTracking/assets',
  // ------------------ Form fields -----------------------
  formFields: [
    // ----------------- asset_id (PK) -------------------
    {
      key: 'asset_id',
      label: 'Asset ID',
      type: 'text' as const,
      required: true,
      disabled: true
    },

    // ----------------- name -------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true 
    },

    // ----------------- model ------------------
    { 
      key: 'model', 
      label: 'Model', 
      type: 'text' as const, 
      required: true 
    },

    // --------------- description ----------------
    { 
      key: 'description', 
      label: 'Description', 
      type: 'textarea' as const 
    },

    // ---------------- category -----------------
    { 
      key: 'category', 
      label: 'Category', 
      type: 'text' as const, 
      required: true 
    },

    // --------------- condition -----------------
    {
      key: 'condition',
      label: 'Condition',
      type: 'select' as const,
      options: [
        { value: 'In-use', label: 'In-use' },
        { value: 'In-store', label: 'In-store' },
        { value: 'Spoiled', label: 'Spoiled' }
      ]
    },

    // ------------- location_id (FK) ------------------
    { 
      key: 'location_id', 
      label: 'Location (Optional)', 
      type: 'select' as const 
      // Made optional by removing required
    },
    
    // -------------- department_id (FK) --------------
    { 
      key: 'department_id', 
      label: 'Department (Optional)', 
      type: 'select' as const 
      // Made optional by removing required
    }
  ]
}

// ------------ Main edit form page component ----------------
export default function EditAssetPage() {
  // useParams() reads the [id] segment from the URL
  // Example: /editAsset/ICT-LAPTOP-001 - The id is ICT-LAPTOP-001
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()
  const params = useParams()

  // useParams() returns : { id: string | string[] }
  // Array.isArray check covers both cases without type cast
  // If the id is undefined, then dynamicEdit will handle the
  // failed fetch gracefully.
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  return <DynamicEdit config={editAssetConfig} recordId={id ?? ''} />
}
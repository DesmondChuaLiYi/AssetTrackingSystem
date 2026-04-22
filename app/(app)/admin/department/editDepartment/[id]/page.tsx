// app\(app)\admin\department\editDepartment\[id]\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file editDepartment/[id]/page.tsx
 * @description Edit form page for a single department record
 * 
 * This page is reached by clicking "Edit" on a record in the department listing page
 * The department's ID is embedded in the URL:
 *   - /admin/department/editDepartment/IT
 * 
 * All form rendering, data loading and saving are handled by dynamicEdit
 * This file only defines the config and safely extracts the ID from the URL
 *   - useParams() makes that value available in the component
 * 
 * Related files
 *   - components/dynamicEdit.tsx : Generic edit form component
 *   - app/api/department/[id]/route.ts : GET and PUT for a single department
 *   - app/(app)/admin/department/units/page.tsx : The listing page for departments
 */
// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'
import type { dynamicEditConfig } from '@/components/dynamicEdit'

// ----------------- Edit form configurations -------------------------
// dynamicEditConfig is added here so that TypeScript can validate the config
// before passing to dynamicEdit
const editDepartmentConfig: dynamicEditConfig = {
  entityName: 'department',
  entityDisplayName: 'Departments',
  entityDisplayNameSingular: 'Department',
  // api route for GET (load) and PUT (update) for department
  apiEndpoint: '/api/department',
  // Primary key to fetch the record
  primaryKey: 'department_id',
  pageTitle: 'Edit Department',
  // URL to go to after editing and cancelling the edit
  backUrl: '/admin/department/units',

  // --------------------------- Form fields -------------------------
  formFields: [
    // -------------------- department_id (PK) --------------------
    {
      key: 'department_id',
      label: 'Department ID',
      type: 'text' as const,
      required: true,
      // Primary key cannot be changed after creation
      disabled: true
    },

    // --------------------- name -----------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true 
    },

    // -------------------- block ------------------------
    { 
      key: 'block', 
      label: 'Block', 
      type: 'text' as const
    },

    // -------------------- level --------------------
    { 
      key: 'level', 
      label: 'Level', 
      type: 'number' as const
     }
  ]
}

// ---------------------- Export the main page component ----------------------
export default function EditDepartmentPage() {
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()
  const params = useParams()

  // This extracts the id safely
  // If the ID is an array, like ["IT"], then we take the first array value - "IT"
  // Otherwise, if it is a string, take it as it is - "IT"
  // Else, if it is null, then give empty ' '
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '')

  // Passes the config to dynamicEdit which handles the logic and form data
  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  return <DynamicEdit config={editDepartmentConfig} recordId={id} />
}
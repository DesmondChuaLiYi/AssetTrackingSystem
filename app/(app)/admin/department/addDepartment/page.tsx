// app\(app)\admin\department\addDepartment\page.tsx
'use client'

/** Commented by Desmond @ 22-April-26
 * @file addDepartment/page.tsx
 * @description Add form page for creating a new department record
 * 
 * This page is reached by clicking the "Add" button in the departments listing page
 * Unlike assets, department_id will be used for the QR codes that user can scan the
 * department QR code to tag assets to a specific department without having to open the
 * web app first
 * 
 * All form logic, validation and submission are handled by dynamicAdd
 * This file only defines what the form looks like using the config object
 * 
 * Related files
 *   - components/dynamicAdd.tsx : The generic add form component
 *   - app/api/department/route.ts : The POST endpoint for creating departments
 *   - app/(app)/admin/department/units/page.tsx : The listing page for all the departments 
 */

// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
import DynamicAdd from '@/components/dynamicAdd'
import type { dynamicAddConfig } from '@/components/dynamicAdd'

// ------------------- Add form configuration -----------------
// dynamicAddConfig is added here so that TypeScript can validate the config
// before passing to dynamicAdd
const addDepartmentConfig: dynamicAddConfig = {
  entityName: 'department',
  entityDisplayName: 'Departments',
  entityDisplayNameSingular: 'Department',
  // api endpoint for department
  apiEndpoint: '/api/department',
  // Primary key to access the records
  primaryKey: 'department_id',
  pageTitle: 'Add Department',
  // URL to go to after creating for cancelling department creation
  backUrl: '/admin/department/units',

  // ------------------------ Form fields -----------------------
  formFields: [
    // ------------------ department_id (PK) ---------------
    {
      key: 'department_id',
      label: 'Department ID',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter department ID (e.g., IT, MKT, HR)'
    },

    // ------------------ name ---------------------
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text' as const, 
      required: true,
      placeholder: 'e.g., Information & Communications Technology',
      // Added max length 30 on 27/04/26 Daryl
      maxLength: 30
    },

    // ------------------ block ----------------------
    { 
      key: 'block', 
      label: 'Block', 
      type: 'text' as const,
      placeholder: 'e.g., A, B, E, G'
    },

    // ------------------ level ---------------------
    { 
      key: 'level', 
      label: 'Level', 
      type: 'number' as const,
      placeholder: 'e.g., 1, 2, 3'
    }
  ]
}

// ----------------- Export the main page component -------------------
export default function AddDepartmentPage() {
  // Passes the config to dynamicAdd which handles everything else
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  return <DynamicAdd config={addDepartmentConfig} />
}

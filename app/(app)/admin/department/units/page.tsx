// app\(app)\admin\department\units\page.tsx
'use client'

// useAdminAccess - protects this page so only admins can access it, redirect others to /unauthorized
import { useAdminAccess } from '@/hooks/useAdminAccess'
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
 */
import DynamicPage from '@/components/dynamicPage'
import type { dynamicPageConfig } from '@/components/dynamicPage'

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

// ----------------- Export the page component -----------------
export default function DepartmentPage() {
  // Passes the config to dynamicPage which handles the logic and form data
  // Block non-admins from accessing this page on the client side
  const { isLoading, isAdmin } = useAdminAccess()

  // Show nothing while checking session, or if user is not admin (hook will redirect them)
  if (isLoading || !isAdmin) {
    return null
  }

  return <DynamicPage config={config} />
}
/** Commented by Desmond @ 26-Mar-26
 * hooks/useAdminAccess.ts
 */
'use client' // Makes the page client component

import { useEffect } from 'react'
import { useRouter } from 'next/navigation' // Redirect users to another page without re-rendering entire page
import { useSession } from 'next-auth/react' // See the user logged in, session data and login status

// Clearly define what user roles exist in the system
type role = 'admin' | 'staff'

// This is a type guard which only accepts either 'admin' or 'staff'
function isValidRole(value: unknown): value is role {
  return value === 'admin' || value === 'staff'
}

// Main custom react hook
// Allows for things like - const { isAdmin } = useAdminAccess()
export function useAdminAccess() {
  const { data: session, status } = useSession() // Fetch the user session
  const router = useRouter() // Redirect users
  
  // Get the user role using session
  const userRole: role | undefined = isValidRole(session?.user?.role) // Checks if user role is valid
    ? session?.user?.role // If valid, use it
    : undefined // Not valid, then set as undefined

  useEffect(() => {
    // While loading, do nothing
    if (status === 'loading') { 
      return
    }

    // If not logged in, redirect home
    if (status === 'unauthenticated') {
      router.replace('/login') // router.replace replaces history so cannot go back
      return
    }

    // If logged in but NOT an admin, redirect to unauthorized
    if (status === 'authenticated' && userRole !== 'admin') {
      router.replace('/unauthorized')
    }
    
  }, [status, userRole, router]) // Runs when these are used

  return { // Make these usable in other components
    session, 
    status, 
    isLoading: status === 'loading',
    isAdmin: userRole === 'admin' 
  }
}
'use client'

import { useEffect } from 'react' // Run side effects like redirecting
import { useSession } from 'next-auth/react' // Get the current login session
import { useRouter } from 'next/navigation' // Redirect user to another page

/**
 * Custom hook to get authenticated user session
 * Auto-redirects unauthenticated users to /login
 * Use this on pages that any logged-in user (admin or staff) can access
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === 'loading'

  useEffect(() => {
    // While session is still loading, do nothing yet
    if (isLoading) return

    // If user is not logged in, send them to login page
    if (status === 'unauthenticated') {
      router.replace('/login') // replace so they can't press back to get in
    }
  }, [status, isLoading, router])

  return {
    session: session?.user || null,
    isLoading,
    isAuthenticated: !!session,
  }
}

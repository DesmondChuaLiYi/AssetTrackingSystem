'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * This is a custom hook to protect admin pages
 * It redirects non-admin users to the unauthorised page
 */
export function useAdminAccess() {
  const { data: session, status: isLoading } = useSession()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Wait for session to load
    if (isLoading === 'loading') return

    // Reset redirect flag when session changes
    hasRedirected.current = false

    // Redirect to login if not authenticated
    if (!session) {
      if (!hasRedirected.current) {
        hasRedirected.current = true
        router.replace('/')
      }
      return
    }

    // Check if user is admin (by role)
    const isAdmin = (session.user as any)?.role === 'admin'

    // Redirect to unauthorized if not admin
    if (!isAdmin) {
      if (!hasRedirected.current) {
        hasRedirected.current = true
        router.replace('/unauthorized')
      }
      return
    }
  }, [session, isLoading, router])

  return { session, isLoading: isLoading === 'loading' }
}

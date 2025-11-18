'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/SessionProvider'

/**
 * Custom hook to protect pages that require authentication
 * Redirects non-authenticated users to login page
 * Returns session and loading state
 */
export function useAuth() {
  const { session, isLoading } = useSession()
  const router = useRouter()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Wait for session to load
    if (isLoading) return

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
  }, [session, isLoading, router])

  return { session, isLoading }
}

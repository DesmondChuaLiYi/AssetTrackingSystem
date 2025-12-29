'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/sessionProvider'

// Hardcoded admin emails (temporary until role management is fully implemented)
const ADMIN_EMAILS = [
  '104385730@students.swinburne.edu.my',
  '104401021@students.swinburne.edu.my',
  '104401173@students.swinburne.edu.my',
]

/**
 * Custom hook to protect admin pages
 * Redirects non-admin users to unauthorized page
 * Returns session and loading state
 */
export function useAdminAccess() {
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

    // Check if user is admin (by email or role)
    const isAdmin = session.role === 'admin' || (session.email && ADMIN_EMAILS.includes(session.email))

    // Redirect to unauthorized if not admin
    if (!isAdmin) {
      if (!hasRedirected.current) {
        hasRedirected.current = true
        router.replace('/unauthorized')
      }
      return
    }
  }, [session, isLoading, router])

  return { session, isLoading }
}

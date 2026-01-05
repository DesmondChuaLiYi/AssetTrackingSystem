'use client'

import { useSession } from 'next-auth/react'

/**
 * Custom hook to get authenticated user session
 * Pages are already protected by (app) layout middleware
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'

  return {
    session: session?.user || null,
    isLoading,
    isAuthenticated: !!session,
  }
}

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession as useNextAuthSession } from 'next-auth/react'

interface UserSession {
  sessionId: string | null
  staffId: string | null
  name: string | null
  email: string | null
  departmentId: string | null
  mobileNo: string | null
  microsoftUserId: string | null
  role: string | null
}

interface SessionContextType {
  session: UserSession | null
  setSession: (session: UserSession | null) => void
  startSession: (staffData: any, microsoftUserId: string) => Promise<void>
  endSession: () => Promise<void>
  isLoading: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { data: nextAuthSession, status } = useNextAuthSession()

  // Just use NextAuth session status
  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true)
      return
    }

    if (status === 'authenticated' && nextAuthSession?.user) {
      // Use NextAuth session data
      setSession({
        sessionId: null,
        staffId: (nextAuthSession.user as any).staffId || null,
        name: nextAuthSession.user.name || null,
        email: nextAuthSession.user.email || null,
        departmentId: null,
        mobileNo: null,
        microsoftUserId: (nextAuthSession.user as any).microsoftUserId || null,
        role: (nextAuthSession.user as any).role || null,
      })
    } else {
      setSession(null)
    }

    setIsLoading(false)
  }, [status, nextAuthSession])

  const startSession = async (staffData: any, microsoftUserId: string) => {
    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staffData.id || staffData.staff_id,
          email: staffData.email,
          microsoftUserId,
        }),
      })

      const data = await response.json()

      if (data.success && data.session) {
        const newSession: UserSession = {
          sessionId: data.session.sessionId,
          staffId: data.session.staffId,
          name: data.session.name,
          email: data.session.email,
          departmentId: data.session.departmentId,
          mobileNo: data.session.mobileNo,
          microsoftUserId: data.session.microsoftUserId,
          role: data.session.role,
        }
        setSession(newSession)
      } else {
        throw new Error(data.error || 'Failed to start session')
      }
    } catch (error) {
      console.error('Error starting session:', error)
      throw error
    }
  }

  const endSession = async () => {
    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Error ending session:', error)
    } finally {
      setSession(null)
    }
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        startSession,
        endSession,
        isLoading,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
'use client'

import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from '@/lib/msalConfig'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  )
}
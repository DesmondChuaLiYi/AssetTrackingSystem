// nextAuthProvider.tsx
// NextAuth keeps track of everyone and who is logged on
'use client' // This is a client-side component because it needs
             // to remember who is logged in across the app
             // and tells Next.js the file runs in the browser
             // and not the server
import { SessionProvider } from "next-auth/react" // Knows who is logged in, their email and role
import { ReactNode } from "react" // For anything React can show on the screen

interface NextAuthProviderProps { // Label for the props (children, or page contents)
  children: ReactNode // Anything React can show on the screen
}

// Takes children (the app) and wraps it in NextAuth SessionProvider
export function NextAuthProvider({ children }: NextAuthProviderProps) {
  return (
    <SessionProvider> {/* Provides session (who is logged in) to the app */}
      {children} {/* Render the child components here */}
    </SessionProvider>
  )
}

// Commented by Desmond @ 7-Jan-26 : Some self note
/* 
  - The file needs to "use client" because NextAuth reads cookies, react to
  - login/logout, and updates the UI when session changes.
  - So it needs to run in the browser, not server side.
  - If "use client" is removed, then the session won't update and
  - hooks like useSession() will crash, therefore the app breaks
*/
// End

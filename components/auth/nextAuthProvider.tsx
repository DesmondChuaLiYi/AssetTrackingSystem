// nextAuthProvider.tsx
// NextAuth keeps track of everyone and who is logged on
'use client' // This is a client-side component because it needs
             // to remember who is logged in across the app
             // and tells Next.js the file runs in the browser
             // and not the server
import { SessionProvider } from "next-auth/react" // Knows who is logged in, their email and role
import type { ReactNode } from "react" // For anything React can show on the screen

interface nextAuthProviderProps { // Label for the props (children, or page contents)
  children: ReactNode // Anything React can show on the screen
}

// Takes children (the app) and wraps it in NextAuth SessionProvider
export function NextAuthProvider({ children }: nextAuthProviderProps) {
  return (
    <SessionProvider
      /** Commented by Desmond @ 26-Mar-26
        * To prevent the app from being re-rendered each time the user changes tab or goes to another window:
        * 1. refetchOnWindowFocus set to false to prevent redundant API calls 
        *    and UI flickering when switching tabs/windows.
        * 2. refetchInterval ensures session validity is checked periodically 
        *    without being tied to erratic user window focus events.
      */
      refetchOnWindowFocus={false} // Disable focus-based refetching
      refetchInterval={5 * 60} // Verify the session every 5 minutes in the background
    > {/* Provides session (who is logged in) to the app */}
      
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

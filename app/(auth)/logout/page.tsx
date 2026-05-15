// app/(auth)/logout/page.tsx
'use client'

/** Commented by Desmond @ 3-May-26
 * @file app/(auth)/logout/page.tsx
 * @description Entering /logout in the URL redirects to this page and uses the
 * app/api/auth/logout/route.ts to log the user out and immediately redirects to /login
 * 
 * Logout sequence (runs once on mount):
 *  1. POST /api/auth/logout to clear the custom session and NextAuth cookies 
 *  2. router.replace('/login') to redirect the user back to the /login page with no
 *     history entry so the back button cannot return to this page or other protected
 *     pages
 * 
 * Security note(s):
 *  The page is inside (auth) layout which renders the page without the navbar or 
 *  sidebar.
 */

import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function logoutPage() {
    const router = useRouter()

    // Prevents the logout sequence from running twice in React Strict Mode
    const hasLoggedOut = useRef(false)

    useEffect(() => {
        // If logout has already occurred
        if (hasLoggedOut.current) {
            // Exit early
            return
        }
        // Mark logout as already executed
        hasLoggedOut.current = true

        // Placed here because useEffect itself cannot be async
        // So the logic is wrapped in an inner async function
        const performLogout = async () => {
            try { 
                try {
                    // NextAuth logout
                    // Clears NextAuth client-side session state
                    await signOut ({
                        // Prevents automatic redirect to control navigation manually
                        redirect: false
                    })
                // Catch the errors
                } catch {
                    // Log the error to console for developers
                    console.error(['[logout] NextAuth signOut error'])
                }

                try {
                    // Clear the server-side cookies (user_session + NextAuth cookies + NextAuth callback-url)
                    // Call the logout API to perform server logout
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    })
                // Catch the errors
                } catch {
                    // Though server cookie clearing failed, but proceed with client-side
                    // invalidation later on
                    // Even if server fails, continue the logout process and do not block the user
                    console.error('[logout] Server cookie clear failed, proceed with client signOut')
                }

                // Replace the current entry and reroute to /login
                // Prevents user from navigating back to the previous page
                router.replace('/login')
            } catch (error) {
                // Fallback error handling
                console.error('[logout] Unexpected error occurred during logout:', error)
                router.replace('/login')
            }
        }
        // Execute the function
        performLogout()
    }, []) // Run on mount

    // Do not need to render any UI
    return null
}
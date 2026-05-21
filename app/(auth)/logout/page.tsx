// app/(auth)/logout/page.tsx
'use client'

/** Commented by Desmond @ 3-May-26
 * @file app/(auth)/logout/page.tsx
 * @description Entering /logout in the URL redirects to this page and uses the
 * app/api/auth/logout/route.ts to log the user out and immediately redirects to /login
 * 
 * LATEST CHANGES
 * --------------
 * The login success toast does not appear when the user logs back in after using
 * /logout directly.
 * 
 * The root cause is because:
 *      The layoutWrapper.tsx shows the "Login successful! Welcome back." toast when the
 *      user lands on /dashboard path AND the sessionStorage key 'lastPath' was previously
 *      set to a login-related path.
 * 
 *      When using the logoutButton.tsx component (which is the normal method to logout),
 *      the logout APi clears cookies and then router.replace('/login') runs inside the
 *      app shell where layoutWrapper is still mounted. As the user navigates away, the
 *      layoutWrapper's pathname useEffect sets sessionStorage.lastPath = '/login'. When
 *      the user signs back in and lands on /dashboard, lastPath IS '/login', the toast
 *      will show.
 * 
 *      When using /logout (using the URL to log the user out), the logout page is an
 *      auth page (inside the (auth) layout) and therefore layoutWrapper was not mounted.
 *      So the pathname useEffect in layoutWrapper never executes, and 'lastPath' is 
 *      never set to '/login', and when the user signs in again, the login success toast
 *      will not show.
 * 
 * To fix this (though this is far from being an industry standard method):
 *      Set the sessionStorage.lastPath = '/login' inside performLogout() BEFORE calling
 *      router.replace('/login'). The is what the layoutWrapper would have done if it
 *      was mounted on the auth page.  The toast will then display correctly when the 
 *      user reaches the dashboard.
 * 
 *      The sessionStorage.removeItem('lastPath') is NOT called here, and we want 
 *      lastPath to survive as '/login' so the toast can detect that user came from the
 *      login flow.
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
                    // Firstly, clear the server-side cookies (user_session + NextAuth cookies + NextAuth 
                    // callback-url)
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

                try {
                    // NextAuth logout
                    // Secondly, clear the NextAuth client-side session state
                    await signOut ({
                        // Prevents automatic redirect to control navigation manually
                        redirect: false
                    })
                // Catch the errors
                } catch {
                    // Log the error to console for developers
                    console.error(['[logout] NextAuth signOut error'])
                }


                // Set the lastPath to '/login' so layoutWrapper's toast check succeeds
                // when the user signs back in and reaches the dashboard.
                // Without this, the /logout page bypasses layoutWrapper entirely because
                // this is an auth page so lastPath is never set and the toast is 
                // skipped.
                try {
                    sessionStorage.setItem('lastPath', '/login')
                } catch {
                    // Throw the error but this is non fatal so non needed
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
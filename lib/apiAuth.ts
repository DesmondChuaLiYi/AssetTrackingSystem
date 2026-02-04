// lib/apiAuth.ts
/* Commented by Desmond @ 24-Jan-2026
    - This is an auth helper file to help
    - authenticate API routes and ensure only users
    - with valid session or required roles can access
    - the API routes
*/

import { getServerSession } from "next-auth/next"; // ask whether the user has session cookie
import { authOptions } from "@/lib/auth"; // tell NextAuth how sessions work in the app
import { NextResponse } from "next/server"; // properly return HTTP responses (404, etc)
import type { Session } from "next-auth";
type AuthResult = 
    | { authorized: true; session: Session } // If authorised, get session
    | { authorized: false; response: NextResponse }; // not authorised, get HTTP response

/**
 * This is a JSDoc (JavaScript Documentation)
 * It is basically a documentation that tells
 *  - what the machine does
 *  - what you can give it
 *  - what it gives back
 * 
 * Check user session to see if someone is allowed to use an API route
 * @param requiredRole - Optional role required (e.g., 'admin') // sometimes only admin is allowed to use the API
 * @returns Authorization result with session or error response // return either the user session or an HTTP response
 */

/**
 * If there is requiredRole such as 'admin' passed into the method
 * then only the admins are allowed to access the API
 * Otherwise, proceed as usual
 * 
 * 'export': Other files can use this method, hence the keyword
 * 'async': This function does something that takes time, like reading cookies and verifying users
 * 'requiredRole?': The ? symbol means the parameter is optional
 * Therefore, validateSession() is allowed, validateSession("admin") also allowed
 * 'Promise<AuthResult>: The function always return an AuthResult but asynchronously
 */
export async function validateSession(requiredRole?: string): Promise<AuthResult> {
    // Read the session cookie and put it in 'session'
    const session = await getServerSession(authOptions);

    /** Check if the user is authenticated
     * '!session': No session at all
     * '!session.user': Broken or incomplete session
     * This protects against
     * - expired cookies
     * - corrupted cookies
     * - misconfigured auth callbacks
     */
    if (!session || !session.user) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: "Unauthorized - Please log in"},
                { status: 401 } // Fail to login because invalid credentials
            )
        };
    }

    // Check if specific role is required
    // If a role is required AND the user's role does not match the required role
    if (requiredRole && session.user.role !== requiredRole) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Forbidden - ${requiredRole} role required' },
                { status: 403 } // Server refuse to authorize the request
            )
        };
    }
    // The user is logged in, allowed access and here's the session
    return { authorized: true, session };
}

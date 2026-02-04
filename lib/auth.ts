// lib/auth.ts
// This is a config file for NextAuth authentication
import { AuthOptions } from "next-auth" // Tells TypeScript what shape our auth config must have
import AzureADProvider from "next-auth/providers/azure-ad" // Allows people to log in using Microsoft accounts (Azure Active Directory)
import { supabaseAdmin } from "@/lib/supabase/server" // Import Supabase admin client for database access"

// Define the staff data that we are fetching from the database
type staffData = {
    staff_id: string
    role: string
    department_id: string | null
    mobile_no: string | null
}

export const authOptions: AuthOptions = { // Creating auth config and export it
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!, // Secrets from Azure AD
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!, // Secrets from Azure AD
            tenantId: process.env.AZURE_AD_TENANT_ID!, // Secrets from Azure AD
            authorization: {
                params: {
                    scope: "openid profile email User.Read", // Tell Azure which user info we want
                    prompt: "select_account", // Always ask the user which account to use
                },
            },
            // PKCE protects against code injection
            // State protects against CSRF attacks
            checks: ["pkce", "state"],
        }),
    ],

    callbacks: {
        // jwt callback runs when a JWT token is created or updated
        async jwt({ token, account, profile }) {
            if (account && profile) { // On first sign in
                // Store the trusted Microsoft user ID in the token (oid)
                // to match the microsoft_user_id in the staff table
                token.microsoftUserId =
                    (profile as any).oid ?? // 'oid' is the object ID in Azure AD
                    (profile as any).sub ?? // 'sub' is the subject ID in some cases
                    account.providerAccountId // Fallback to provider account ID
            }

            // Load staff data from the database once per session
            if (token.email && !token.role) { // If we have the email but no role
                const { data, error } = await supabaseAdmin // Query from the Staff table
                    .from("Staff") // Table name
                    .select("staff_id, role, department_id, mobile_no") // Column names
                    .eq("email", token.email) // Match the email
                    .single<staffData>() // Only grab one result, using the staffData type

                if (!error && data) { // Only proceed when no error 
                    token.staffId = data.staff_id
                    token.role = data.role
                    token.departmentId = data.department_id
                    token.mobileNo = data.mobile_no
                } else if (error) { // Error output
                    console.error("Error fetching staff data:", error.message)
                }
            }

            return token // Return the updated token
        },

        // session callback runs when NextAuth sends session info to the client
        async session({ session, token }) {
            if (session.user) { // If user info exists in the session
                // The microsoftUserId and role are attached from the JWT token
                session.user.microsoftUserId = token.microsoftUserId as string // Add Microsoft user ID to session
                session.user.staffId = token.staffId as string // Add staff ID to the session
                session.user.role = token.role as string // Add user role to session
                session.user.departmentId = token.departmentId as string // Add department ID to session
                session.user.mobileNo = token.mobileNo as string // Add mobile number to session    
            }
            return session // Return the updated session
        },
    },

    // Use JWT for session strategy
    session: {
        strategy: "jwt", // The session is stored as a JSON Web Token instead of a database session
        maxAge: 15 * 60, // Session lasts for 15 minutes
        updateAge: 5 * 60, // Token is refreshed every 5 minutes while active
    },
    // Signs the JWT tokens and ensuring no one can forge them
    secret: process.env.NEXTAUTH_SECRET,
}
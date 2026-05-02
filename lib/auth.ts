// lib/auth.ts
// This is a config file for NextAuth authentication
import type { AuthOptions } from "next-auth" // Tells TypeScript what shape our auth config must have
import AzureADProvider from "next-auth/providers/azure-ad" // Allows people to log in using Microsoft accounts (Azure Active Directory)
import { supabaseAdmin } from "@/lib/supabase/server" // Import Supabase admin client for database access"

// Define the staff data that we are fetching from the database
type staffData = {
    staff_id: string
    role: string
    status: string
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

            // Re-check status from the database on every JWT refresh.
            // This ensures that if an admin changes a user's status (e.g. approved → pending),
            // the change takes effect within the next token refresh cycle (up to 5 minutes).
            if (token.email) {
                const { data, error } = await supabaseAdmin // Query from the Staff table
                    .from("Staff") // Table name
                    .select("staff_id, role, status, department_id, mobile_no") // Column names
                    .eq("email", token.email) // Match the email
                    .single<staffData>() // Only grab one result, using the staffData type

                if (!error && data) { // Only proceed when no error
                    // Block login if account is not approved
                    if (data.status !== 'approved') {
                        token.role = data.status // Set role to 'pending' or 'rejected' so loginClient.tsx can show the right message
                        token.staffId = undefined
                        token.departmentId = undefined
                        token.mobileNo = undefined
                        return token
                    }

                    token.staffId = data.staff_id
                    token.role = data.role
                    token.departmentId = data.department_id
                    token.mobileNo = data.mobile_no

                    // On first login, write the Microsoft ID to DB if not yet stored
                    if (token.microsoftUserId) {
                        await supabaseAdmin
                            .from("Staff")
                            .update({ microsoft_user_id: token.microsoftUserId as string })
                            .eq("email", token.email)
                            .is("microsoft_user_id", null) // Only update if still null — avoids unnecessary writes
                    }
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
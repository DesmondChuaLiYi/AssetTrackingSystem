import NextAuth, { AuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"

const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
          prompt: "select_account", // Always show account selection screen
        }
      },
      checks: ["pkce", "state"],
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Add Microsoft user ID to token on first sign in
      if (account && profile) {
        // Use 'oid' (object ID) which is the same GUID format that MSAL used
        // This matches the microsoft_user_id in your Supabase database
        token.microsoftUserId = (profile as any).oid || (profile as any).sub || account.providerAccountId
      }

      // Fetch user role, staffId, department, and mobile from database
      if (token.email) {
        try {
          const response = await fetch(
            `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/staff/get-by-email`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: token.email }),
            }
          );

          const data = await response.json();
          if (data.success && data.staff) {
            token.role = data.staff.role;
            token.staffId = data.staff.staff_id;
            token.departmentId = data.staff.department_id;
            token.mobileNo = data.staff.mobile_no;
            // Commented by Desmond @ 1-Jan-26: Use the username from Swinburne instead of Supabase
            // token.name = data.staff.name;
            // End
          }
        } catch (error) {
          console.error('Error fetching staff role:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add Microsoft user ID, role, staffId, and other data to session
      if (session.user) {
        session.user.microsoftUserId = token.microsoftUserId as string;
        session.user.role = token.role as string;
        session.user.staffId = token.staffId as string;
        session.user.departmentId = token.departmentId as string;
        session.user.mobileNo = token.mobileNo as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes idle timeout (in seconds)
    updateAge: 5 * 60, // Refresh session every 5 minutes when active (in seconds)
  },
  useSecureCookies: false, // Set to false for localhost
  debug: true, // Enable debug mode to see what's happening
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

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
      return token
    },
    async session({ session, token }) {
      // Add Microsoft user ID to session object
      if (session.user) {
        session.user.microsoftUserId = token.microsoftUserId as string
      }
      return session
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

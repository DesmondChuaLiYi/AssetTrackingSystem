// app/api/auth/[...nextauth]/route.ts
/* Commented by Desmond @ 24-Jan-2026
  - This file contains the NextAuth handler for authentication
  - It should remain public for authentication
*/
import NextAuth, { AuthOptions } from "next-auth" // NextAuth handler
import { authOptions } from "@/lib/auth"; // Import auth config

const handler = NextAuth(authOptions) // Create NextAuth handler with config

export { handler as GET, handler as POST } // Export handler for both GET and POST requests

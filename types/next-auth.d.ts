import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      microsoftUserId?: string
      role?: string
      staffId?: string
      departmentId?: string | null
      mobileNo?: string | null
    }
  }

  interface User {
    microsoftUserId?: string
    role?: string
    staffId?: string
    departmentId?: string
    mobileNo?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    microsoftUserId?: string
    role?: string
    staffId?: string
    departmentId?: string | null
    mobileNo?: string | null
    name?: string
  }
}

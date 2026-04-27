// app/api/sessions/end/route.ts
// Called by logoutButton.tsx on sign out. Clears the user_session cookie.
// Sessions table has been removed as session tracking is handled by NextAuth.
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' })

    // Clear the user_session cookie set by /api/sessions/set-cookie
    response.cookies.set('user_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    const response = NextResponse.json({ success: true, message: 'Logged out' })
    response.cookies.set('user_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  }
}

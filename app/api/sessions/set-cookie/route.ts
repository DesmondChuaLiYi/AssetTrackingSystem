import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { staffId, role, action } = await request.json()

    if (action === 'clear') {
      // Clear the session cookie
      cookies().delete('user_session')
      return NextResponse.json({ success: true, message: 'Cookie cleared' })
    }

    if (!staffId || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Set secure session cookie
    const sessionData = {
      staffId,
      role,
      timestamp: new Date().toISOString()
    }

    // Set cookie with security options
    cookies().set({
      name: 'user_session',
      value: JSON.stringify(sessionData),
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return NextResponse.json({
      success: true,
      message: 'Session cookie set successfully'
    })

  } catch (error) {
    console.error('Error setting session cookie:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

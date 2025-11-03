import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Add content-type check and better error handling
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    let requestBody
    try {
      const text = await request.text()
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'Request body is empty' },
          { status: 400 }
        )
      }
      requestBody = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { microsoftUserId, staffId, loginLocation } = requestBody

    if (!microsoftUserId || !staffId) {
      return NextResponse.json(
        { error: 'Missing required fields: microsoftUserId and staffId' },
        { status: 400 }
      )
    }

    // Create new session record
    const { data: session, error } = await supabase
      .from('sessions')
      .insert([
        {
          staff_id: staffId,
          login_location: loginLocation || 'Unknown',
          status: 'active'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session
    })

  } catch (error) {
    console.error('Session start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

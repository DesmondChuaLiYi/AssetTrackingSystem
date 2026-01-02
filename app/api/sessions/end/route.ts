import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, staffId } = await request.json()

    if (!sessionId && !staffId) {
      return NextResponse.json(
        { error: 'Either sessionId or staffId is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('Sessions')
      .update({
        logout_time: new Date().toISOString(),
        status: 'ended'
      })

    // End session by session ID or by staff ID (end all active sessions)
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      query = query.eq('staff_id', staffId).eq('status', 'active')
    }

    const { data, error } = await query.select()

    if (error) {
      console.error('Error ending session:', error)
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sessions: data
    })

  } catch (error) {
    console.error('Session end error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

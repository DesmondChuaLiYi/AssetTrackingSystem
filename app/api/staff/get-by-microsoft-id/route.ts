import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { microsoftUserId } = await request.json()

    if (!microsoftUserId) {
      return NextResponse.json(
        { error: 'Microsoft user ID is required' },
        { status: 400 }
      )
    }

    // Look up staff by Microsoft user ID
    const { data: staff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('microsoft_user_id', microsoftUserId)
      .single()

    if (error) {
      // If staff not found, return null (not an error - might be first login)
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          staff: null,
          message: 'Staff not found - needs registration'
        })
      }

      console.error('Error fetching staff:', error)
      return NextResponse.json(
        { error: 'Failed to fetch staff data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff
    })

  } catch (error) {
    console.error('Get staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

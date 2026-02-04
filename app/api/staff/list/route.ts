import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    // Fetch only approved staff members
    const { data: staff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('status', 'approved')
      .order('created_dt', { ascending: false })

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json(
        { error: 'Failed to fetch staff list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: staff || []
    })

  } catch (error) {
    console.error('List staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

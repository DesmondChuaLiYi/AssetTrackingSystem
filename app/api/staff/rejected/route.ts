import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Fetch all rejected staff
    const { data: rejectedStaff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('status', 'rejected')
      .order('created_dt', { ascending: false })

    if (error) {
      console.error('Error fetching rejected staff:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rejected staff' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: rejectedStaff || []
    })

  } catch (error) {
    console.error('Get rejected staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

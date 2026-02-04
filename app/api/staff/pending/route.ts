import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Fetch all pending staff registrations
    const { data: pendingStaff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('status', 'pending')
      .order('created_dt', { ascending: false })

    if (error) {
      console.error('Error fetching pending staff:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending registrations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: pendingStaff || []
    })

  } catch (error) {
    console.error('Get pending staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

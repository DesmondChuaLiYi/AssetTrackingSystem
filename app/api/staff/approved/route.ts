import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Fetch all approved staff
    const { data: approvedStaff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('status', 'approved')
      .order('created_dt', { ascending: false })

    if (error) {
      console.error('Error fetching approved staff:', error)
      return NextResponse.json(
        { error: 'Failed to fetch approved staff' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: approvedStaff || []
    })

  } catch (error) {
    console.error('Get approved staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

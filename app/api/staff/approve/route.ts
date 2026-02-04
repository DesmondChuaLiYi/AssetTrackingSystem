import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { staff_id } = await request.json()

    if (!staff_id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Update staff status to 'approved'
    const { data: updatedStaff, error } = await supabase
      .from('Staff')
      .update({
        status: 'approved',
        updated_dt: new Date().toISOString()
      })
      .eq('staff_id', staff_id)
      .select()
      .single()

    if (error) {
      console.error('Error approving staff:', error)
      return NextResponse.json(
        { error: 'Failed to approve staff member' },
        { status: 500 }
      )
    }

    if (!updatedStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member approved successfully',
      staff: updatedStaff
    })

  } catch (error) {
    console.error('Approve staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { staff_id, name, email, mobile_no, department_id, microsoft_user_id } = await request.json()

    // Validation
    if (!staff_id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Update staff member
    const { data: staff, error } = await supabase
      .from('Staff')
      .update({
        name,
        email,
        mobile_no,
        department_id,
        microsoft_user_id,
        updated_dt: new Date().toISOString()
      })
      .eq('staff_id', staff_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating staff:', error)
      return NextResponse.json(
        { error: 'Failed to update staff member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff
    })

  } catch (error) {
    console.error('Update staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

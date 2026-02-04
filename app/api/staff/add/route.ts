import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { staff_id, name, email, mobile_no, department_id, microsoft_user_id } = await request.json()

    // Validation
    if (!staff_id || !name || !email || !mobile_no || !department_id || !microsoft_user_id) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Insert new staff member
    const { data: staff, error } = await supabase
      .from('Staff')
      .insert([
        {
          staff_id,
          name,
          email,
          mobile_no,
          department_id,
          microsoft_user_id,
          created_dt: new Date().toISOString(),
          updated_dt: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error adding staff:', error)

      // Check for duplicate key error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Staff ID already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to add staff member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff
    })

  } catch (error) {
    console.error('Add staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

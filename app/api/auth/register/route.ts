// app/api/auth/register/route.ts
/* Commented by Desmond @ 24-Jan-2026
  - This route should remain public for user registration
  - It is also protected by middleware.ts
*/
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, mobile_no, department_id } = await request.json()

    // Validation
    if (!name || !email || !mobile_no || !department_id) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingStaff } = await supabase
      .from('Staff')
      .select('email, status')
      .eq('email', email)
      .single()

    if (existingStaff) {
      if (existingStaff.status === 'pending') {
        return NextResponse.json(
          { error: 'Your registration is pending approval. Please wait for admin confirmation.' },
          { status: 409 }
        )
      } else if (existingStaff.status === 'approved') {
        return NextResponse.json(
          { error: 'This email is already registered. Please login.' },
          { status: 409 }
        )
      } else if (existingStaff.status === 'rejected') {
        return NextResponse.json(
          { error: 'Your previous registration was rejected. Please contact administrator.' },
          { status: 403 }
        )
      }
    }

    // Get next staff_id using the database function
    const { data: nextIdData, error: idError } = await supabase
      .rpc('get_next_staff_id')

    if (idError) {
      console.error('Error getting next staff ID:', idError)
      return NextResponse.json(
        { error: 'Failed to generate staff ID' },
        { status: 500 }
      )
    }

    const staff_id = nextIdData as string

    // Insert new staff registration (status defaults to 'pending')
    const { data: newStaff, error: insertError } = await supabase
      .from('Staff')
      .insert([
        {
          staff_id,
          name,
          email,
          mobile_no,
          department_id,
          status: 'pending',
          role: 'staff',
          microsoft_user_id: null, // Will be filled at first login
          created_dt: new Date().toISOString(),
          updated_dt: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting staff:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit registration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully! Please wait for admin approval.',
      staff: {
        staff_id: newStaff.staff_id,
        name: newStaff.name,
        email: newStaff.email
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

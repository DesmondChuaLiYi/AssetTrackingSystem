// app/api/auth/register/route.ts
// Accepts user-supplied staff_id (digits only) instead of auto-generating via DB function.
// Validates all inputs with Zod before inserting into Staff table.
// microsoft_user_id is left null here and filled automatically on first Microsoft login.
// This route is public — no session required.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

// Zod schema — mirrors DB column limits and business rules
const RegisterSchema = z.object({
  // staff_id: digits only, 1–30 chars (VARCHAR(30) in DB)
  staff_id: z
    .string()
    .min(1, 'Staff ID is required')
    .max(30, 'Staff ID cannot exceed 30 characters')
    .regex(/^\d+$/, 'Staff ID must contain digits only'),

  name: z
    .string()
    .min(1, 'Name is required')
    .max(60, 'Name cannot exceed 60 characters')
    .regex(/^[^<>"'`;\\]+$/, 'Name contains invalid characters'),

  email: z
    .string()
    .min(1, 'Email is required')
    .max(60, 'Email cannot exceed 60 characters')
    .email('Invalid email format')
    .regex(/^[^<>"'`;\\]+$/, 'Email contains invalid characters'),

  mobile_no: z
    .string()
    .min(1, 'Mobile number is required')
    .max(20, 'Mobile number cannot exceed 20 characters')
    .regex(/^[^<>"'`;\\]+$/, 'Mobile number contains invalid characters'),

  department_id: z
    .string()
    .min(1, 'Department is required')
    .max(30, 'Department cannot exceed 30 characters')
    .regex(/^[^<>"'`;\\]+$/, 'Department contains invalid characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate with Zod — returns typed data or throws with field-level messages
    const parsed = RegisterSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      )
    }

    const { staff_id, name, email, mobile_no, department_id } = parsed.data

    // Check Staff ID uniqueness
    const { data: existingById } = await supabase
      .from('Staff')
      .select('staff_id')
      .eq('staff_id', staff_id)
      .single()

    if (existingById) {
      return NextResponse.json(
        { error: `Staff ID ${staff_id} is already registered.` },
        { status: 409 }
      )
    }

    // Check email uniqueness — surface meaningful message based on approval status
    const { data: existingByEmail } = await supabase
      .from('Staff')
      .select('email, status')
      .eq('email', email)
      .single()

    if (existingByEmail) {
      if (existingByEmail.status === 'pending') {
        return NextResponse.json(
          { error: 'Your registration is pending approval. Please wait for admin confirmation.' },
          { status: 409 }
        )
      } else if (existingByEmail.status === 'approved') {
        return NextResponse.json(
          { error: 'This email is already registered. Please login.' },
          { status: 409 }
        )
      } else if (existingByEmail.status === 'rejected') {
        return NextResponse.json(
          { error: 'Your previous registration was rejected. Please contact administrator.' },
          { status: 403 }
        )
      }
    }

    // Insert new staff — status defaults to 'pending', microsoft_user_id filled on first login
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
          microsoft_user_id: null,
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

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'
// Verifies the request has a valid login session and the required role before allowing access
import { validateSession } from '@/lib/apiAuth'
// Schema validation library — ensures the request body only contains expected fields and formats
import { z } from 'zod'

// Defines the exact shape of a valid request body
// .strict() rejects any extra fields not listed here, preventing unexpected data from reaching the database
const addStaffSchema = z.object({
  staff_id: z.string().max(20),
  name: z.string().max(100),
  email: z.string().email().max(100), // .email() ensures the value is a valid email format
  mobile_no: z.string().max(20),
  department_id: z.string().max(50),
}).strict()

export async function POST(request: NextRequest) {
  // Checks the user is logged in and has 'admin' role — returns 401/403 and exits if not
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    // Read the raw request body
    const body = await request.json()

    // Validate the body against the schema
    // .safeParse() returns { success, data } or { success, error } without throwing exceptions
    const parsed = addStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Use only the validated fields — guarantees no unexpected fields reach the database
    const { staff_id, name, email, mobile_no, department_id } = parsed.data

    // Insert new staff member — microsoft_user_id is left null, filled automatically on first login
    const { data: staff, error } = await supabase
      .from('Staff')
      .insert([
        {
          staff_id,
          name,
          email,
          mobile_no,
          department_id,
          microsoft_user_id: null,
          created_dt: new Date().toISOString(),
          updated_dt: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      // Logs only the message string, not the full error object which may expose DB internals
      console.error('Error adding staff:', { message: error.message })

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

  } catch (error: any) {
    // error?.message safely accesses the message — if error is null/undefined it won't crash
    console.error('Add staff error:', { message: error?.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

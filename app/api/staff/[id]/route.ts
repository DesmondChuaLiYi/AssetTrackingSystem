// app/api/staff/[id]/route.ts
// GET and PUT for a single staff record, used by DynamicEdit to fetch and update.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateSession } from '@/lib/apiAuth'

// Fetches a single staff record by staff_id
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    const { data, error } = await supabaseAdmin
      .from('Staff')
      .select('*, department:department_id(department_id, name)')
      .eq('staff_id', id)
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('GET /api/staff/[id] error:', { message: error?.message })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Updates a single staff record, staff_id cannot be changed
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    const body = await request.json()
    const updateData = { ...body, updated_dt: new Date().toISOString() }
    delete updateData.staff_id // Prevent primary key from being changed

    const { data, error } = await supabaseAdmin
      .from('Staff')
      .update(updateData)
      .eq('staff_id', id)
      .select('*, department:department_id(department_id, name)')
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('PUT /api/staff/[id] error:', { message: error?.message })
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

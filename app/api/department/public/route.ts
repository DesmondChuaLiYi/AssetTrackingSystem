// app/api/department/public/route.ts
// Public endpoint — no session required.
// Used by the registration form to populate the department dropdown before the user is logged in.
// Only returns department_id and name — no sensitive data exposed.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('Department')
    .select('department_id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching departments:', { message: error.message })
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

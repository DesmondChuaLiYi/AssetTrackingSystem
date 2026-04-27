// app/api/auth/check-staff-id/route.ts
// Returns { exists: boolean } — used by the registration form to detect duplicate Staff IDs in real time.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const staff_id = request.nextUrl.searchParams.get('staff_id')

  if (!staff_id || !/^\d+$/.test(staff_id)) {
    return NextResponse.json({ exists: false })
  }

  const { data } = await supabase
    .from('Staff')
    .select('staff_id')
    .eq('staff_id', staff_id)
    .single()

  return NextResponse.json({ exists: !!data })
}

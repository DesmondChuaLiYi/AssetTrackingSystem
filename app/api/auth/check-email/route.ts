// app/api/auth/check-email/route.ts
// Returns { message: string | null } — null means email is free to use.
// Used by the registration form to show status-specific duplicate warnings inline.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ message: null })
  }

  const { data } = await supabase
    .from('Staff')
    .select('email, status')
    .eq('email', email)
    .single()

  if (!data) return NextResponse.json({ message: null })

  if (data.status === 'pending') {
    return NextResponse.json({ message: 'Your registration is pending approval. Please wait for admin confirmation.' })
  }
  if (data.status === 'approved') {
    return NextResponse.json({ message: 'This email is already registered. Please login.' })
  }
  if (data.status === 'rejected') {
    return NextResponse.json({ message: 'Your previous registration was rejected. Please contact administrator.' })
  }

  return NextResponse.json({ message: null })
}

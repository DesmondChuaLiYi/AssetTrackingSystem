// app/api/staff/approvals/route.ts
// Returns paginated staff records filtered by status (pending/approved/rejected).
// Also returns tabCounts for all three statuses so the tab badges stay accurate.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateSession } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = (searchParams.get('search') || '').slice(0, 100)
    const allowedSearchFields = ['staff_id', 'name']
    const searchField = allowedSearchFields.includes(searchParams.get('searchField') || '')
      ? searchParams.get('searchField')!
      : 'staff_id'
    const allowedSortFields = ['staff_id', 'name', 'created_dt']
    const sortBy = allowedSortFields.includes(searchParams.get('sortBy') || '')
      ? searchParams.get('sortBy')!
      : 'created_dt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const status = searchParams.get('status') || 'pending'

    // Main paginated query
    let query = supabaseAdmin
      .from('Staff')
      .select('staff_id, name, email, mobile_no, department_id, status, created_dt', { count: 'exact' })
      .eq('status', status)

    if (search) query = query.ilike(searchField, `%${search}%`)
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Count all three statuses for tab badges
    const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
      supabaseAdmin.from('Staff').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('Staff').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabaseAdmin.from('Staff').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ])

    return NextResponse.json({
      data: data || [],
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      tabCounts: {
        pending: pendingResult.count ?? 0,
        approved: approvedResult.count ?? 0,
        rejected: rejectedResult.count ?? 0,
      },
    })
  } catch (error: any) {
    console.error('GET /api/staff/approvals error:', { message: error?.message })
    return NextResponse.json({ error: 'Failed to fetch staff approvals' }, { status: 500 })
  }
}

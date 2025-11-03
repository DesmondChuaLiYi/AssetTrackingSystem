// File 1: app/api/locations/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const searchField = searchParams.get('searchField') || 'name'
    const sortBy = searchParams.get('sortBy') || 'created_dt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let query = supabase
      .from('location')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.ilike(searchField, `%${search}%`)
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data: data || [],
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('GET /api/location error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch locations',
        details: error
      },
      { status: 500 }
    )
  }
}


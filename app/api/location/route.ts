import { supabase } from '@/lib/supabase/client'
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
      .from('Location')
      .select('*', { count: 'exact' })

    // Apply search filter fo UUID
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { department_id, ...locationData } = body  // Remove department_id if present

    if (!locationData.name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('Location')
      .insert([{
        ...locationData,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()

    if (error) throw error

    return NextResponse.json({
      data: data[0],
      success: true
    })
  } catch (error) {
    console.error('POST /api/location error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create location',
        success: false
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('location_id') // Changed from 'id' to 'location_id'

    if (!id) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('Location')
      .delete()
      .eq('location_id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully'
    })
  } catch (error) {
    console.error('DELETE /api/location error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete location',
        success: false
      },
      { status: 500 }
    )
  }
}


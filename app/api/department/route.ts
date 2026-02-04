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
      .from('Department')
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
    console.error('GET /api/department error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch departments',
        details: error
      },
      { status: 500 }
    )
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { location_id, ...departmentData } = body  // Remove location_id if present

    if (!departmentData.name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('Department')
      .insert([{
        ...departmentData,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data[0]
    })
  } catch (error) {
    console.error('POST /api/department error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create department',
        success: false
      },
      { status: 500 }
    )
  }
}
export async function PUT() {
  try {
    const { data, error } = await supabase
      .from('Department')
      .select('*')
      .order('department_id', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      data: data || []
    })
  } catch (error) {
    console.error('GET /api/departments error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch departments',
        details: error
      },
      { status: 500 }
    )
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('department_id')

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('Department')
      .delete()
      .eq('department_id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully'
    })
  } catch (error) {
    console.error('DELETE /api/department error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete department',
        success: false
      },
      { status: 500 }
    )
  }
}
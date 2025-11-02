// File 1: app/api/assets/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch assets with search and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const searchField = searchParams.get('searchField') || 'name'
    const condition = searchParams.get('condition') || ''
    const sortBy = searchParams.get('sortBy') || 'created_dt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let query = supabase
      .from('asset')
      .select(`
        *,
        location:location_id(name, description),
        department:department_id(name)
      `, { count: 'exact' })

    // Apply condition filter
    if (condition) {
      query = query.eq('condition', condition)
    }

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

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      data: data || [],
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('GET /api/assets error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch assets',
        details: error
      },
      { status: 500 }
    )
  }
}

// POST - Create new asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.asset_id || !body.name || !body.model || !body.category || !body.location_id || !body.department_id) {
      return NextResponse.json(
        { error: 'Missing required fields: asset_id, name, model, category, location_id, department_id' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('asset')
      .insert([{
        asset_id: body.asset_id,
        name: body.name,
        model: body.model,
        description: body.description || '',
        condition: body.condition || 'Good',
        location_id: body.location_id,
        department_id: body.department_id,
        category: body.category,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/assets error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create asset',
        details: error
      },
      { status: 500 }
    )
  }
}

// PUT - Update asset by ID
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset_id, ...updateData } = body

    if (!asset_id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('asset')
      .update({
        ...updateData,
        updated_dt: new Date().toISOString()
      })
      .eq('asset_id', asset_id)
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('PUT /api/assets error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update asset',
        details: error
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete asset by ID
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const asset_id = searchParams.get('asset_id')

    if (!asset_id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('asset')
      .delete()
      .eq('asset_id', asset_id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/assets error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete asset',
        details: error
      },
      { status: 500 }
    )
  }
}
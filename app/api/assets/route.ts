// app/api/assets/route.ts
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
      if (searchField === 'location') {
        query = query.ilike('location.name', `%${search}%`)
      } else if (searchField === 'department') {
        query = query.ilike('department.name', `%${search}%`)
      } else {
        query = query.ilike(searchField, `%${search}%`)
      }
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

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

    if (!body.asset_id || !body.name || !body.model || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: asset_id, name, model, category' },
        { status: 400 }
      )
    }

    // if (!body.asset_id || !body.name || !body.model || !body.category || !body.location_id || !body.department_id) {
    //   return NextResponse.json(
    //     { error: 'Missing required fields: asset_id, name, model, category, location_id, department_id' },
    //     { status: 400 }
    //   )
    // }

    const { data, error } = await supabase
      .from('asset')
      .insert([{
        asset_id: body.asset_id,
        name: body.name,
        model: body.model,
        description: body.description || '',
        condition: body.condition || 'In-use',
        location_id: body.location_id,
        department_id: body.department_id,
        category: body.category,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

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

    console.log('Updating asset:', asset_id, 'with data:', updateData)

    // Prepare update object with only valid fields
    const updateObject: any = {
      updated_dt: new Date().toISOString()
    }

    // Only include fields that are provided and valid
    if (updateData.name) updateObject.name = updateData.name
    if (updateData.model) updateObject.model = updateData.model
    if (updateData.description !== undefined) updateObject.description = updateData.description
    if (updateData.condition) updateObject.condition = updateData.condition
    if (updateData.location_id) updateObject.location_id = updateData.location_id
    if (updateData.department_id) updateObject.department_id = updateData.department_id
    if (updateData.category) updateObject.category = updateData.category

    const { data, error } = await supabase
      .from('asset')
      .update(updateObject)
      .eq('asset_id', asset_id)
      .select(`
        *,
        location:location_id(name, description),
        department:department_id(name)
      `)

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }

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

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

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
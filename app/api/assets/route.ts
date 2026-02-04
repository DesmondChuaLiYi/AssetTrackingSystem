// app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
/**
 * In the API routes, we should not use client Supabase because
 * - client.ts uses the anon key
 * - the anon key relies on RLS
 * - the API routes should not trust client RLS
 * - we already validate the session using apiAuth.ts
 */
import { supabaseAdmin } from '@/lib/supabase/server'
import { validateSession } from '@/lib/apiAuth'

// Allowed asset condition values
const ALLOWED_CONDITIONS = ['In-use', 'In-store', 'Spoiled'] as const
type AssetCondition = typeof ALLOWED_CONDITIONS[number]

// GET - Fetch assets with search and pagination
export async function GET(request: NextRequest) {
  const authResult = await validateSession()

  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    const search = searchParams.get('search') || ''
    const condition = searchParams.get('condition') || ''

    const allowedSearchFields = ['name', 'model', 'category']
    const searchField = allowedSearchFields.includes(
      searchParams.get('searchField') || ''
    )
      ? searchParams.get('searchField')!
      : 'name'

    const allowedSortFields = ['created_dt', 'updated_dt', 'name']
    const sortBy = allowedSortFields.includes(
      searchParams.get('sortBy') || ''
    )
      ? searchParams.get('sortBy')!
      : 'created_dt'

    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const allowedConditions = ['In-use', 'In-store', 'Spoiled']

    let query = supabaseAdmin // Use Supabase admin to query the table
      .from('Asset') // Fetch from Asset table
      .select(`
        *,
        location:location_id(name, description),
        department:department_id(name)
      `, { count: 'exact' })

    // Apply condition filter
    if (condition && allowedConditions.includes(condition)) {
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

    if (error) {
      console.error('Asset fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) { // Catch any error
    console.error('GET /api/assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new asset
export async function POST(request: NextRequest) {
  const authResult = await validateSession()

  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const body = await request.json()

    if (!body.asset_id || !body.name || !body.model || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // if (!body.asset_id || !body.name || !body.model || !body.category || !body.location_id || !body.department_id) {
    //   return NextResponse.json(
    //     { error: 'Missing required fields: asset_id, name, model, category, location_id, department_id' },
    //     { status: 400 }
    //   )
    // }

    const { data, error } = await supabaseAdmin
      .from('Asset')
      .insert([{
        asset_id: body.asset_id,
        name: body.name,
        model: body.model,
        description: body.description || '',
        condition: body.condition || 'In-use',
        location_id: body.location_id || null,
        department_id: body.department_id || null,
        category: body.category,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique key constraint violation
        return NextResponse.json(
          { error: 'Asset already exists' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { success: true, data},
      { status: 201 }
    )

  } catch (error) {
    console.error('POST /api/assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error'},
      { status: 500 }
    )
  }
}

// PUT - Update asset by ID
export async function PUT(request: NextRequest) {
  const authResult = await validateSession()

  if (!authResult.authorized) {
    return authResult.response
  }
  
  try {
    const body = await request.json()
    const { asset_id } = body

    if (!asset_id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'name',
      'model',
      'description',
      'condition',
      'location_id',
      'department_id',
      'category',
    ]

    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field]
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updateData.updated_dt = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('Asset')
      .update(updateData)
      .eq('asset_id', asset_id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }

    return NextResponse.json(
      { success: true, data}
    )
  } catch (error) {
    console.error('PUT /api/assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete asset by ID
export async function DELETE(request: NextRequest) {
  const authResult = await validateSession('admin')

  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const asset_id = searchParams.get('asset_id')

    if (!asset_id) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('Asset')
      .delete()
      .eq('asset_id', asset_id)

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

    return NextResponse.json(
      { success: true, message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
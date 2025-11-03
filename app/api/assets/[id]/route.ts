import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from('asset')
      .select(`
        *,
        location:location_id(location_id, name),
        department:department_id(department_id, name)
      `)
      .eq('asset_id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { asset_id, ...updateData } = body // Remove asset_id from update data
    
    // Add updated_dt timestamp
    updateData.updated_dt = new Date().toISOString()

    const { data, error } = await supabase
      .from('asset')
      .update(updateData)
      .eq('asset_id', params.id)
      .select(`
        *,
        location:location_id(location_id, name),
        department:department_id(department_id, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
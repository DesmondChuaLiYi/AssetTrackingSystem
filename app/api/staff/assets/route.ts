import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { staffId } = await request.json()

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Fetch assets assigned to this staff member
    // Join staff_asset with asset table to get full asset details
    const { data: assignments, error } = await supabase
      .from('StaffAsset')
      .select(`
        id,
        staff_id,
        asset_id,
        created_dt,
        asset:asset_id (
          asset_id,
          name,
          model,
          description,
          condition,
          category
        )
      `)
      .eq('staff_id', staffId)
      .order('created_dt', { ascending: false })

    if (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assets: assignments
    })

  } catch (error) {
    console.error('Get assets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

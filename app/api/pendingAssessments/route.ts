import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Fetch ALL maintenance_needed = true records
    // The page will split them into pending / approved / rejected tabs
    // using the approval_status column
    const { data, error } = await supabaseAdmin
      .from('Maintenance')
      .select('*')
      .eq('maintenance_needed', true)
      .order('assessed_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, assessments: data ?? [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}
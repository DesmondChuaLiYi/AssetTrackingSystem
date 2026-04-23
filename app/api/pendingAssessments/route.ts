import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { validateSession } from '@/lib/apiAuth';

export async function GET() {
  // RBAC: Only admins can fetch the pending review queue
  const authResult = await validateSession('admin');
  if (!authResult.authorized) return authResult.response;

  try {
    // shows all the asset with maintenance needed "Yes" (WC)
    // The page will split them into pending / approved / rejected 
    const { data, error } = await supabaseAdmin
      .from('Maintenance')
      .select('*')
      .eq('maintenance_needed', true)
      .order('assessed_dt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, assessments: data ?? [] });
  } catch (error: any) {
    console.error('Pending assessments fetch error:', { message: error?.message });
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}